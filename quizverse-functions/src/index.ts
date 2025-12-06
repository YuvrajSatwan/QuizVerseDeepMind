import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Node 18+ provides a global fetch, but declare it for TypeScript
// so we can use it without additional dependencies.
declare const fetch: any;

// Calculate leaderboard when quiz status changes
export const calculateLeaderboard = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return;

    // Only calculate when quiz ends
    if (oldData.status !== "ended" && newData.status === "ended") {
      const quizId = context.params.quizId;
      const playersRef = admin.firestore().collection(`quizzes/${quizId}/players`);
      const playersSnapshot = await playersRef.get();

      const leaderboard: any[] = [];
      playersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        const playerData = doc.data();
        leaderboard.push({
          id: doc.id,
          name: playerData.name,
          score: playerData.score || 0,
          joinedAt: playerData.joinedAt
        });
      });

      // Sort by score (desc), then by join time (asc)
      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.joinedAt.toMillis() - b.joinedAt.toMillis();
      });

      // Update quiz with leaderboard
      await admin.firestore().collection("quizzes").doc(quizId).update({
        leaderboard,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Handle quiz status changes
export const onQuizStatusChange = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return;

    const quizId = context.params.quizId;

    // Start quiz automatically after 30 seconds if enough players
    if (oldData.status === "waiting" && newData.status === "waiting") {
      const playersRef = admin.firestore().collection(`quizzes/${quizId}/players`);
      const playersSnapshot = await playersRef.get();

      if (playersSnapshot.size >= 2) {
        setTimeout(async () => {
          const quizDoc = await admin.firestore().collection("quizzes").doc(quizId).get();
          if (quizDoc.exists && quizDoc.data()?.status === "waiting") {
            await admin.firestore().collection("quizzes").doc(quizId).update({
              status: "active",
              startedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }, 30000);
      }
    }
  });

// API endpoint for quiz statistics
export const getQuizStats = functions.https.onRequest(async (req: functions.Request, res: functions.Response) => {
  try {
    const quizzesSnapshot = await admin.firestore().collection("quizzes").get();
    
    const stats = {
      totalQuizzes: quizzesSnapshot.size,
      activeQuizzes: 0,
      completedQuizzes: 0,
      totalPlayers: 0
    };

    for (const doc of quizzesSnapshot.docs) {
      const data = doc.data();
      if (data.status === "active" || data.status === "waiting") {
        stats.activeQuizzes++;
      } else if (data.status === "ended") {
        stats.completedQuizzes++;
      }

      // Count players in this quiz
      const playersSnapshot = await admin.firestore()
        .collection(`quizzes/${doc.id}/players`)
        .get();
      stats.totalPlayers += playersSnapshot.size;
    }

    res.json(stats);
  } catch (error) {
    console.error("Error getting quiz stats:", error);
    res.status(500).json({error: "Failed to get stats"});
  }
});

// Cleanup old quizzes (runs weekly)
export const cleanupOldQuizzes = functions.pubsub
  .schedule("0 0 * * 0")
  .timeZone("UTC")
  .onRun(async (context: functions.EventContext) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oldQuizzesSnapshot = await admin.firestore()
      .collection("quizzes")
      .where("createdAt", "<", oneWeekAgo)
      .where("status", "==", "ended")
      .get();

    const batch = admin.firestore().batch();
    
    for (const doc of oldQuizzesSnapshot.docs) {
      // Delete players subcollection
      const playersSnapshot = await admin.firestore()
        .collection(`quizzes/${doc.id}/players`)
        .get();
      
      playersSnapshot.forEach((playerDoc: admin.firestore.QueryDocumentSnapshot) => {
        batch.delete(playerDoc.ref);
      });
      
      // Delete quiz document
      batch.delete(doc.ref);
    }

    await batch.commit();
    console.log(`Cleaned up ${oldQuizzesSnapshot.size} old quizzes`);
  });

interface DifficultyDistribution {
  easy?: number;
  medium?: number;
  hard?: number;
}

interface AiGenerateQuizRequest {
  subject?: string | null;
  topic: string;
  difficulty?: DifficultyDistribution;
  count?: number;
  types?: string[];
  contextText?: string | null;
}

type QuestionType = "MCQ" | "TF" | "short";

interface AiQuestion {
  qid: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  conceptTags: string[];
  modelMeta?: { provider: string; confidence?: number };
}

function normalizeDifficulty(input?: DifficultyDistribution): DifficultyDistribution {
  const base = {
    easy: typeof input?.easy === "number" ? input.easy : 33,
    medium: typeof input?.medium === "number" ? input.medium : 33,
    hard: typeof input?.hard === "number" ? input.hard : 34,
  };
  const total = base.easy + base.medium + base.hard;
  if (!total || total <= 0) return { easy: 33, medium: 33, hard: 34 };
  return {
    easy: (base.easy / total) * 100,
    medium: (base.medium / total) * 100,
    hard: (base.hard / total) * 100,
  };
}

async function callQGen(
  req: AiGenerateQuizRequest,
): Promise<{ questions: AiQuestion[]; provider: string } | null> {
  const cfg = (functions.config() as any).qgen || (functions.config() as any).singularity;
  if (!cfg || !cfg.endpoint) {
    console.log("[aiGenerateQuiz] QGen config not found, skipping QGen provider");
    return null;
  }

  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.api_key ? { Authorization: `Bearer ${cfg.api_key}` } : {}),
      },
      body: JSON.stringify({
        ...req,
        difficulty: normalizeDifficulty(req.difficulty),
      }),
    });

    if (!res.ok) {
      console.warn("[aiGenerateQuiz] QGen returned non-OK status:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const rawQuestions = Array.isArray(json.questions) ? json.questions : [];

    const questions: AiQuestion[] = rawQuestions.map((q: any, index: number) => ({
      qid: String(q.qid || q.id || index),
      text: String(q.text || q.question || ""),
      type: (q.type === "TF" || q.type === "short" || q.type === "MCQ" ? q.type : "MCQ") as QuestionType,
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : undefined,
      correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer : undefined,
      explanation: String(q.explanation || ""),
      difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as
        | "easy"
        | "medium"
        | "hard",
      conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags.map((t: any) => String(t)) : [],
      modelMeta: {
        provider: "singularity-qgen",
        ...(typeof q.modelMeta?.confidence === "number" ? { confidence: q.modelMeta.confidence } : {}),
      },
    }));

    return { questions, provider: "singularity-qgen" };
  } catch (err) {
    console.error("[aiGenerateQuiz] QGen call failed, falling back:", err);
    return null;
  }
}

async function callOpenAI(
  req: AiGenerateQuizRequest,
): Promise<{ questions: AiQuestion[]; provider: string } | null> {
  const openaiCfg = (functions.config() as any).openai;
  const apiKey: string | undefined = openaiCfg && openaiCfg.api_key;
  if (!apiKey) {
    console.log("[aiGenerateQuiz] OpenAI API key not configured, skipping OpenAI provider");
    return null;
  }

  const model = openaiCfg.model || "gpt-4o-mini";

  const prompt = {
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quizzes for teachers. Return ONLY valid JSON. Do not include any markdown or commentary.",
      },
      {
        role: "user",
        content: `Generate a quiz for the topic "${req.topic}"${
          req.subject ? ` in subject "${req.subject}"` : ""
        }.\n\nNumber of questions: ${req.count || 10}.\nDifficulty distribution (percent): easy ${
          req.difficulty?.easy ?? "33"
        }%, medium ${req.difficulty?.medium ?? "33"}%, hard ${req.difficulty?.hard ?? "34"}%.\nAllowed question types: ${
          (req.types && req.types.length ? req.types : ["MCQ"]).join(", ")
        }.\nEach question must include: qid (string), text, type ("MCQ" | "TF" | "short"), options (for MCQ), correctIndex (for MCQ or TF, 0-based), correctAnswer (for short answer text), explanation, difficulty ("easy" | "medium" | "hard"), conceptTags (array of short strings), modelMeta with provider and confidence (0-1).\n${
          req.contextText ? `Reference text to use as context:\n${req.contextText}\n` : ""
        }\nRespond with JSON: { "questions": [ ... ] }`,
      },
    ],
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(prompt),
    });

    if (!res.ok) {
      console.warn("[aiGenerateQuiz] OpenAI returned non-OK status:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.warn("[aiGenerateQuiz] OpenAI response missing content");
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        parsed = JSON.parse(content.slice(start, end + 1));
      } else {
        throw new Error("Unable to parse JSON from OpenAI response");
      }
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: AiQuestion[] = rawQuestions.map((q: any, index: number) => ({
      qid: String(q.qid || q.id || index),
      text: String(q.text || q.question || ""),
      type: (q.type === "TF" || q.type === "short" || q.type === "MCQ" ? q.type : "MCQ") as QuestionType,
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : undefined,
      correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer : undefined,
      explanation: String(q.explanation || ""),
      difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as
        | "easy"
        | "medium"
        | "hard",
      conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags.map((t: any) => String(t)) : [],
      modelMeta: {
        provider: `openai:${model}`,
        ...(typeof q.modelMeta?.confidence === "number" ? { confidence: q.modelMeta.confidence } : {}),
      },
    }));

    return { questions, provider: `openai:${model}` };
  } catch (err) {
    console.error("[aiGenerateQuiz] OpenAI call failed:", err);
    return null;
  }
}

async function callHuggingFace(
  req: AiGenerateQuizRequest,
): Promise<{ questions: AiQuestion[]; provider: string } | null> {
  const hfCfg = (functions.config() as any).huggingface || (functions.config() as any).hf;
  const apiKey: string | undefined = hfCfg && hfCfg.api_key;
  const endpoint: string | undefined = hfCfg && hfCfg.endpoint;
  if (!apiKey || !endpoint) {
    console.log("[aiGenerateQuiz] HuggingFace config not found, skipping HF provider");
    return null;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {
          subject: req.subject,
          topic: req.topic,
          difficulty: normalizeDifficulty(req.difficulty),
          count: req.count || 10,
          types: req.types && req.types.length ? req.types : ["MCQ"],
          contextText: req.contextText,
        },
      }),
    });

    if (!res.ok) {
      console.warn("[aiGenerateQuiz] HuggingFace returned non-OK status:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const rawQuestions = Array.isArray(json.questions)
      ? json.questions
      : Array.isArray(json[0]?.questions)
      ? json[0].questions
      : [];

    const questions: AiQuestion[] = rawQuestions.map((q: any, index: number) => ({
      qid: String(q.qid || q.id || index),
      text: String(q.text || q.question || ""),
      type: (q.type === "TF" || q.type === "short" || q.type === "MCQ" ? q.type : "MCQ") as QuestionType,
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : undefined,
      correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer : undefined,
      explanation: String(q.explanation || ""),
      difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as
        | "easy"
        | "medium"
        | "hard",
      conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags.map((t: any) => String(t)) : [],
      modelMeta: {
        provider: "huggingface",
        ...(typeof q.modelMeta?.confidence === "number" ? { confidence: q.modelMeta.confidence } : {}),
      },
    }));

    return { questions, provider: "huggingface" };
  } catch (err) {
    console.error("[aiGenerateQuiz] HuggingFace call failed:", err);
    return null;
  }
}

export const aiGenerateQuiz = functions
  .region("us-central1")
  .https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
    const body = data as AiGenerateQuizRequest;

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      throw new functions.https.HttpsError("invalid-argument", "topic is required");
    }

    const count =
      typeof body.count === "number" && body.count > 0 && body.count <= 50 ? body.count : 10;

    const rawTypes = Array.isArray(body.types) && body.types.length ? body.types : ["MCQ"];
    const types = rawTypes
      .map((t) => String(t).toUpperCase())
      .filter((t) => t === "MCQ" || t === "TF" || t === "SHORT");

    const effectiveTypes = types.length ? types : ["MCQ"];

    const req: AiGenerateQuizRequest = {
      subject: typeof body.subject === "string" ? body.subject : undefined,
      topic,
      difficulty: body.difficulty,
      count,
      types: effectiveTypes,
      contextText: typeof body.contextText === "string" ? body.contextText : undefined,
    };

    let result = await callQGen(req);
    if (!result) {
      result = await callOpenAI(req);
    }
    if (!result) {
      result = await callHuggingFace(req);
    }

    if (!result || !result.questions.length) {
      console.error("[aiGenerateQuiz] All providers failed");
      return {
        ok: false,
        error: "Failed to generate questions. Please try again later.",
      };
    }

    const questions: AiQuestion[] = result.questions.map((q, index) => {
      const type: QuestionType = q.type || "MCQ";
      const difficulty: "easy" | "medium" | "hard" =
        q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium";

      let options = q.options;
      if (type === "MCQ" && (!options || !options.length)) {
        options = ["Option A", "Option B", "Option C", "Option D"];
      }

      let correctIndex = q.correctIndex;
      if ((type === "MCQ" || type === "TF") && (!options || !options.length)) {
        correctIndex = 0;
      } else if (
        typeof correctIndex !== "number" ||
        correctIndex < 0 ||
        (options && correctIndex >= options.length)
      ) {
        correctIndex = 0;
      }

      return {
        qid: q.qid || `q_${index + 1}`,
        text: q.text,
        type,
        options,
        correctIndex: type === "short" ? undefined : correctIndex,
        correctAnswer: type === "short" ? q.correctAnswer || "" : q.correctAnswer,
        explanation: q.explanation || "",
        difficulty,
        conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags : [],
        modelMeta: {
          provider: result!.provider,
          ...(q.modelMeta && typeof q.modelMeta.confidence === "number"
            ? { confidence: q.modelMeta.confidence }
            : {}),
        },
      };
    });

    const draftId = db.collection("quizzes").doc().id;

    await db
      .collection("quizzes")
      .doc("ai_drafts")
      .collection(draftId)
      .doc("questions")
      .set({
        questions,
        meta: {
          subject: req.subject || null,
          topic: req.topic,
          count,
          difficulty: normalizeDifficulty(req.difficulty),
          types: effectiveTypes,
          provider: result.provider,
          requestedBy: context.auth?.uid || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      ok: true,
      draftId,
      questions,
    };
  });
