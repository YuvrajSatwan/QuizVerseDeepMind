import React, { useState, useEffect } from 'react'
import { firebaseDebugger } from '../utils/firebaseDebug'
import { testFirebaseConnection } from '../firebase/config'

const FirebaseDiagnostic = () => {
  const [diagnosticReport, setDiagnosticReport] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('unknown')

  const runDiagnostic = async () => {
    setIsRunning(true)
    try {
      const report = await firebaseDebugger.generateDiagnosticReport()
      setDiagnosticReport(report)
      setConnectionStatus(report.tests.firebaseConnection.success ? 'connected' : 'failed')
    } catch (error) {
      console.error('Diagnostic failed:', error)
      setConnectionStatus('error')
    } finally {
      setIsRunning(false)
    }
  }

  const testConnection = async () => {
    setIsRunning(true)
    try {
      await testFirebaseConnection()
      setConnectionStatus('connected')
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('failed')
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '✅'
      case 'failed': return '❌'
      case 'error': return '⚠️'
      default: return '❓'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Firebase Connection Diagnostic</h2>
        <p className="text-gray-600">
          Use this tool to diagnose and troubleshoot Firebase connectivity issues.
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-medium text-gray-700">Connection Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(connectionStatus)}`}>
            {getStatusIcon(connectionStatus)} {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 space-x-4">
        <button
          onClick={testConnection}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Testing...' : 'Test Connection'}
        </button>
        
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Run Full Diagnostic'}
        </button>
      </div>

      {/* Common Issues & Solutions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">Common Issues & Quick Fixes</h3>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-yellow-700">ERR_BLOCKED_BY_CLIENT</h4>
            <ul className="text-sm text-yellow-600 ml-4 list-disc">
              <li>Disable ad blockers (uBlock Origin, AdBlock Plus)</li>
              <li>Whitelist *.googleapis.com and *.firebaseapp.com</li>
              <li>Try incognito/private browsing mode</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-yellow-700">ERR_QUIC_PROTOCOL_ERROR</h4>
            <ul className="text-sm text-yellow-600 ml-4 list-disc">
              <li>Disable QUIC in Chrome: chrome://flags/#enable-quic</li>
              <li>Try a different network connection</li>
              <li>Check firewall settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Diagnostic Report */}
      {diagnosticReport && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Diagnostic Report</h3>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Timestamp:</span>
              <span className="ml-2 text-gray-600">{new Date(diagnosticReport.timestamp).toLocaleString()}</span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Network Connectivity:</span>
              <span className={`ml-2 ${diagnosticReport.tests.networkConnectivity ? 'text-green-600' : 'text-red-600'}`}>
                {diagnosticReport.tests.networkConnectivity ? '✅ OK' : '❌ Failed'}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Firebase Connection:</span>
              <span className={`ml-2 ${diagnosticReport.tests.firebaseConnection.success ? 'text-green-600' : 'text-red-600'}`}>
                {diagnosticReport.tests.firebaseConnection.success ? '✅ OK' : '❌ Failed'}
              </span>
            </div>

            {diagnosticReport.tests.firebaseConnection.details && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
                <p className="text-sm text-red-700 mb-2">
                  <strong>Type:</strong> {diagnosticReport.tests.firebaseConnection.details.type}
                </p>
                <p className="text-sm text-red-700 mb-3">
                  <strong>Description:</strong> {diagnosticReport.tests.firebaseConnection.details.description}
                </p>
                
                <div>
                  <strong className="text-red-800">Solutions:</strong>
                  <ul className="text-sm text-red-700 ml-4 list-disc mt-1">
                    {diagnosticReport.tests.firebaseConnection.details.solutions.map((solution, index) => (
                      <li key={index}>{solution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browser Console Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Browser Console</h3>
        <p className="text-sm text-blue-700">
          Open your browser's Developer Tools (F12) and check the Console tab for detailed error messages and troubleshooting suggestions.
        </p>
      </div>
    </div>
  )
}

export default FirebaseDiagnostic
