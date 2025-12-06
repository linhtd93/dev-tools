import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { 
  Sparkles, 
  Copy, 
  RotateCcw, 
  Download, 
  Upload,
  CheckCircle2,
  XCircle,
  Minimize2,
  Maximize2,
  Moon,
  Sun,
  ArrowRight,
  Calendar,
  Clock
} from 'lucide-react'
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid'
import { jwtDecode } from 'jwt-decode'
import CryptoJS from 'crypto-js'
import baseX from 'base-x'
import forge from 'node-forge'
import SEOHead from './components/SEOHead'
import { seoConfig } from './config/seoConfig'
import './App.css'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isInitializedRef = useRef(false)
  const inputEditorRef = useRef(null)
  const outputEditorRef = useRef(null)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [stats, setStats] = useState({ chars: 0, lines: 0, size: '0 B' })
  const [theme, setTheme] = useState('dark')
  const [uuidVersion, setUuidVersion] = useState('v4')
  const [uuidCount, setUuidCount] = useState(1)
  const [jwtMode, setJwtMode] = useState('decode') // 'decode' or 'encode'
  const [timestampMode, setTimestampMode] = useState('to-date') // 'to-date' or 'to-timestamp'
  const [codeFormatterLang, setCodeFormatterLang] = useState('go') // 'go', 'java', 'react', 'python', 'rust'
  
  // Hash Generator state
  const [hashAlgorithm, setHashAlgorithm] = useState('MD5') // 'MD5', 'SHA1', 'SHA256', 'SHA512'
  const [hashInput, setHashInput] = useState('')
  const [hashOutput, setHashOutput] = useState('')
  
  // Encoding Tool state
  const [encodingType, setEncodingType] = useState('Base64') // 'Base64', 'Base32', 'Base58', 'Hex', 'HTML', 'URL'
  const [encodingMode, setEncodingMode] = useState('encode') // 'encode' or 'decode'
  const [encodingInput, setEncodingInput] = useState('')
  const [encodingOutput, setEncodingOutput] = useState('')
  
  // Case Converter state
  const [caseInput, setCaseInput] = useState('')
  const [caseResults, setCaseResults] = useState({
    lowercase: '',
    uppercase: '',
    camelCase: '',
    pascalCase: '',
    snakeCase: '',
    kebabCase: '',
    constantCase: ''
  })

  // RSA Encryption state
  const [rsaMode, setRsaMode] = useState('key-generator') // 'key-generator', 'encrypt', 'decrypt', 'sign', 'verify'
  const [rsaKeySize, setRsaKeySize] = useState('2048') // '1024', '2048', '4096'
  const [rsaPublicKey, setRsaPublicKey] = useState('')
  const [rsaPrivateKey, setRsaPrivateKey] = useState('')
  const [rsaInput, setRsaInput] = useState('')
  const [rsaOutput, setRsaOutput] = useState('')
  const [rsaSignature, setRsaSignature] = useState('')
  
  // Text diff state
  const [diffText1, setDiffText1] = useState('')
  const [diffText2, setDiffText2] = useState('')
  const [diffResult, setDiffResult] = useState('')
  
  // Search state - separate for input and output
  const [inputSearchText, setInputSearchText] = useState('')
  const [outputSearchText, setOutputSearchText] = useState('')
  const [inputSearchResults, setInputSearchResults] = useState({ current: 0, total: 0 })
  const [outputSearchResults, setOutputSearchResults] = useState({ current: 0, total: 0 })
  const [inputDecorations, setInputDecorations] = useState([])
  const [outputDecorations, setOutputDecorations] = useState([])
  
  // JSON auto-fix state
  const [jsonAutoFixed, setJsonAutoFixed] = useState(false)
  const [originalJSON, setOriginalJSON] = useState('')
  const [fixedJSON, setFixedJSON] = useState('')
  const [errorPosition, setErrorPosition] = useState(null)
  
  // Separate input/output for each JWT mode
  const [jwtDecodeInput, setJwtDecodeInput] = useState('')
  const [jwtDecodeOutput, setJwtDecodeOutput] = useState('')
  const [jwtEncodeInput, setJwtEncodeInput] = useState('')
  const [jwtEncodeOutput, setJwtEncodeOutput] = useState('')
  
  // Separate input/output for each Timestamp mode
  const [timestampToDateInput, setTimestampToDateInput] = useState('')
  const [timestampToDateOutput, setTimestampToDateOutput] = useState('')
  const [dateToTimestampInput, setDateToTimestampInput] = useState('')
  const [dateToTimestampOutput, setDateToTimestampOutput] = useState('')
  
  // Determine active tool from URL
  const getToolFromPath = (pathname) => {
    if (pathname === '/') return 'json-formatter'
    return pathname.substring(1) // Remove leading slash
  }
  
  const [activeTool, setActiveTool] = useState(getToolFromPath(location.pathname))
  
  // Update active tool when URL changes
  useEffect(() => {
    const newTool = getToolFromPath(location.pathname)
    setActiveTool(newTool)
    
    // Initialize UUID generator with default values ONLY on first load
    if (newTool === 'uuid-generator' && !isInitializedRef.current) {
      isInitializedRef.current = true
      setUuidVersion('v4')
      setUuidCount(1)
      // Generate initial UUID
      const initialUUID = uuidv4()
      setOutput(initialUUID)
    } else if (newTool !== 'uuid-generator') {
      // Reset flag when leaving UUID generator
      isInitializedRef.current = false
    }
  }, [location.pathname])
  
  // Get SEO config for current route
  const currentSEO = seoConfig[location.pathname] || seoConfig['/']

  // Get detailed error position from JSON parse error
  const getErrorDetails = (jsonString, error) => {
    const match = error.message.match(/position (\d+)/i)
    if (match) {
      const pos = parseInt(match[1])
      return { position: pos, line: null, column: null }
    }
    
    // Try to extract line/column from error message
    const lineMatch = error.message.match(/line (\d+)/i)
    const colMatch = error.message.match(/column (\d+)/i)
    
    if (lineMatch || colMatch) {
      const line = lineMatch ? parseInt(lineMatch[1]) : null
      const column = colMatch ? parseInt(colMatch[1]) : null
      
      // Calculate position from line/column
      if (line !== null) {
        const lines = jsonString.split('\n')
        let pos = 0
        for (let i = 0; i < line - 1 && i < lines.length; i++) {
          pos += lines[i].length + 1 // +1 for newline
        }
        if (column !== null) pos += column - 1
        return { position: pos, line, column }
      }
    }
    
    // Fallback: try to find common error patterns
    if (error.message.includes('Unexpected end')) {
      return { position: jsonString.length, line: null, column: null }
    }
    
    // Check for unclosed brackets
    const openBrackets = (jsonString.match(/\[/g) || []).length
    const closeBrackets = (jsonString.match(/\]/g) || []).length
    const openBraces = (jsonString.match(/\{/g) || []).length
    const closeBraces = (jsonString.match(/\}/g) || []).length
    
    if (openBrackets > closeBrackets) {
      const lastOpen = jsonString.lastIndexOf('[')
      return { 
        position: lastOpen, 
        line: null, 
        column: null,
        hint: `Missing ${openBrackets - closeBrackets} closing bracket(s) ]`
      }
    }
    
    if (openBraces > closeBraces) {
      const lastOpen = jsonString.lastIndexOf('{')
      return { 
        position: lastOpen, 
        line: null, 
        column: null,
        hint: `Missing ${openBraces - closeBraces} closing brace(s) }`
      }
    }
    
    return null
  }

  // Get context around error position
  const getErrorContext = (jsonString, position) => {
    if (!position && position !== 0) return null
    
    const start = Math.max(0, position - 50)
    const end = Math.min(jsonString.length, position + 50)
    const before = jsonString.substring(start, position)
    const after = jsonString.substring(position, end)
    const errorChar = jsonString[position] || '(end of file)'
    
    // Calculate line and column
    const beforeError = jsonString.substring(0, position)
    const lines = beforeError.split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1
    
    return { before, after, errorChar, line, column, position }
  }

  // Helper function to highlight error in editor and get context
  const highlightError = (text, errorMessage, line = 1, column = 1, hint = '') => {
    if (inputEditorRef.current) {
      const editor = inputEditorRef.current
      
      const decorations = editor.deltaDecorations([], [
        {
          range: {
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: column + 1
          },
          options: {
            className: 'json-error-highlight',
            glyphMarginClassName: 'json-error-glyph',
            hoverMessage: { 
              value: `**Error:** ${errorMessage}${hint ? `\n\n**Hint:** ${hint}` : ''}`
            },
            inlineClassName: 'json-error-inline'
          }
        }
      ])
      
      editor.revealLineInCenter(line)
      
      setTimeout(() => {
        if (inputEditorRef.current) {
          inputEditorRef.current.deltaDecorations(decorations, [])
        }
      }, 5000)
    }
    
    // Get error context for display
    const lines = text.split('\n')
    const errorLineIndex = line - 1
    const errorLineText = lines[errorLineIndex] || ''
    const position = errorLineText.length > 0 ? Math.min(column - 1, errorLineText.length - 1) : 0
    
    const start = Math.max(0, position - 50)
    const end = Math.min(errorLineText.length, position + 50)
    const before = errorLineText.substring(start, position)
    const after = errorLineText.substring(position, end)
    const errorChar = errorLineText[position] || '(end of line)'
    
    return { before, after, errorChar, line, column }
  }

  // Search function for input editor
  const performInputSearch = useCallback((searchQuery, direction = 'next') => {
    const editor = inputEditorRef.current
    if (!editor || !searchQuery.trim()) {
      if (editor) editor.deltaDecorations(inputDecorations, [])
      setInputDecorations([])
      setInputSearchResults({ current: 0, total: 0 })
      return
    }

    const model = editor.getModel()
    const matches = model.findMatches(searchQuery, true, false, true, null, true)
    
    const decorations = matches.map(match => ({
      range: match.range,
      options: {
        className: 'search-highlight',
        stickiness: 1
      }
    }))

    const newDecorations = editor.deltaDecorations(inputDecorations, decorations)
    setInputDecorations(newDecorations)
    setInputSearchResults({ current: matches.length > 0 ? 1 : 0, total: matches.length })

    if (matches.length > 0) {
      editor.revealRangeInCenter(matches[0].range)
      editor.setSelection(matches[0].range)
    }
  }, [inputDecorations])

  // Search function for output editor
  const performOutputSearch = useCallback((searchQuery, direction = 'next') => {
    const editor = outputEditorRef.current
    if (!editor || !searchQuery.trim()) {
      if (editor) editor.deltaDecorations(outputDecorations, [])
      setOutputDecorations([])
      setOutputSearchResults({ current: 0, total: 0 })
      return
    }

    const model = editor.getModel()
    const matches = model.findMatches(searchQuery, true, false, true, null, true)
    
    const decorations = matches.map(match => ({
      range: match.range,
      options: {
        className: 'search-highlight',
        stickiness: 1
      }
    }))

    const newDecorations = editor.deltaDecorations(outputDecorations, decorations)
    setOutputDecorations(newDecorations)
    setOutputSearchResults({ current: matches.length > 0 ? 1 : 0, total: matches.length })

    if (matches.length > 0) {
      editor.revealRangeInCenter(matches[0].range)
      editor.setSelection(matches[0].range)
    }
  }, [outputDecorations])

  // Navigate input search results
  const navigateInputSearch = useCallback((direction) => {
    const editor = inputEditorRef.current
    if (!editor || !inputSearchText.trim() || inputSearchResults.total === 0) return

    const model = editor.getModel()
    const matches = model.findMatches(inputSearchText, true, false, true, null, true)
    if (matches.length === 0) return

    let newCurrent = inputSearchResults.current
    if (direction === 'next') {
      newCurrent = inputSearchResults.current >= matches.length ? 1 : inputSearchResults.current + 1
    } else {
      newCurrent = inputSearchResults.current <= 1 ? matches.length : inputSearchResults.current - 1
    }

    setInputSearchResults({ ...inputSearchResults, current: newCurrent })
    editor.revealRangeInCenter(matches[newCurrent - 1].range)
    editor.setSelection(matches[newCurrent - 1].range)
  }, [inputSearchText, inputSearchResults])

  // Navigate output search results
  const navigateOutputSearch = useCallback((direction) => {
    const editor = outputEditorRef.current
    if (!editor || !outputSearchText.trim() || outputSearchResults.total === 0) return

    const model = editor.getModel()
    const matches = model.findMatches(outputSearchText, true, false, true, null, true)
    if (matches.length === 0) return

    let newCurrent = outputSearchResults.current
    if (direction === 'next') {
      newCurrent = outputSearchResults.current >= matches.length ? 1 : outputSearchResults.current + 1
    } else {
      newCurrent = outputSearchResults.current <= 1 ? matches.length : outputSearchResults.current - 1
    }

    setOutputSearchResults({ ...outputSearchResults, current: newCurrent })
    editor.revealRangeInCenter(matches[newCurrent - 1].range)
    editor.setSelection(matches[newCurrent - 1].range)
  }, [outputSearchText, outputSearchResults])

  // Auto-fix common JSON errors
  const autoFixJSON = (jsonString) => {
    let fixed = jsonString.trim()
    const changes = []
    
    // Auto-close unclosed brackets
    const openBrackets = (fixed.match(/\[/g) || []).length
    const closeBrackets = (fixed.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      fixed += ']'.repeat(openBrackets - closeBrackets)
      changes.push(`Added ${openBrackets - closeBrackets} closing bracket(s) ]`)
    }
    
    // Auto-close unclosed braces
    const openBraces = (fixed.match(/\{/g) || []).length
    const closeBraces = (fixed.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces)
      changes.push(`Added ${openBraces - closeBraces} closing brace(s) }`)
    }
    
    // Remove trailing commas before } or ]
    const beforeTrailing = fixed
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1')
    if (beforeTrailing !== fixed) changes.push('Removed trailing commas')
    
    // Remove comments (// and /* */)
    const beforeComments = fixed
    fixed = fixed.replace(/\/\/.*/g, '')
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '')
    if (beforeComments !== fixed) changes.push('Removed comments')
    
    // Fix single quotes to double quotes
    const beforeQuotes = fixed
    fixed = fixed.replace(/'/g, '"')
    if (beforeQuotes !== fixed) changes.push('Fixed single quotes → double quotes')
    
    // Fix unquoted keys (simple case: word characters only)
    const beforeKeys = fixed
    fixed = fixed.replace(/(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    if (beforeKeys !== fixed) changes.push('Added quotes to unquoted keys')
    
    // Remove trailing comma at the end
    const beforeEnd = fixed
    fixed = fixed.replace(/,\s*$/, '')
    if (beforeEnd !== fixed) changes.push('Removed trailing comma at end')
    
    return { fixed, changes }
  }

  // Format JSON
  const formatJSON = useCallback((text) => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      setStats({ chars: 0, lines: 0, size: '0 B' })
      setJsonAutoFixed(false)
      setOriginalJSON('')
      setFixedJSON('')
      setErrorPosition(null)
      return
    }

    try {
      // Try parsing original first
      let parsed
      let wasFixed = false
      let fixChanges = []
      
      try {
        parsed = JSON.parse(text)
        setErrorPosition(null)
      } catch (firstError) {
        // Get error details
        const errorDetails = getErrorDetails(text, firstError)
        const context = errorDetails ? getErrorContext(text, errorDetails.position) : null
        
        // If fails, try auto-fix
        const { fixed, changes } = autoFixJSON(text)
        try {
          parsed = JSON.parse(fixed)
          wasFixed = true
          fixChanges = changes
          setOriginalJSON(text)
          setFixedJSON(fixed)
          setErrorPosition(null)
        } catch (secondError) {
          // If still fails after auto-fix, show detailed error
          const finalErrorDetails = getErrorDetails(fixed, secondError)
          const finalContext = finalErrorDetails ? getErrorContext(fixed, finalErrorDetails.position) : null
          
          setErrorPosition({
            original: context,
            fixed: finalContext,
            hint: errorDetails?.hint || finalErrorDetails?.hint
          })
          
          throw firstError
        }
      }
      
      const formatted = JSON.stringify(parsed, null, isCompact ? 0 : indentSize)
      setOutput(formatted)
      setJsonAutoFixed(wasFixed)
      
      // Show warning if auto-fixed with details
      if (wasFixed) {
        setError(`⚠️ JSON auto-fixed:\n${fixChanges.map(c => `• ${c}`).join('\n')}`)
      } else {
        setError('')
      }
      
      // Calculate stats
      const bytes = new Blob([formatted]).size
      const size = bytes < 1024 
        ? `${bytes} B` 
        : bytes < 1024 * 1024 
        ? `${(bytes / 1024).toFixed(2)} KB` 
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      
      setStats({
        chars: formatted.length,
        lines: formatted.split('\n').length,
        size
      })
    } catch (err) {
      const errorDetails = getErrorDetails(text, err)
      const context = errorDetails ? getErrorContext(text, errorDetails.position) : null
      
      // Highlight error in INPUT editor
      if (context && inputEditorRef.current) {
        const editor = inputEditorRef.current
        const model = editor.getModel()
        
        // Create decoration for error highlight
        const decorations = editor.deltaDecorations([], [
          {
            range: {
              startLineNumber: context.line,
              startColumn: context.column,
              endLineNumber: context.line,
              endColumn: context.column + 1
            },
            options: {
              className: 'json-error-highlight',
              glyphMarginClassName: 'json-error-glyph',
              hoverMessage: { 
                value: `**Error:** ${err.message}${errorDetails.hint ? `\n\n**Hint:** ${errorDetails.hint}` : ''}`
              },
              inlineClassName: 'json-error-inline'
            }
          }
        ])
        
        // Scroll to error position
        editor.revealLineInCenter(context.line)
        
        // Clear decorations after 5 seconds
        setTimeout(() => {
          if (inputEditorRef.current) {
            inputEditorRef.current.deltaDecorations(decorations, [])
          }
        }, 5000)
      }
      
      if (context) {
        setError(`❌ Error at line ${context.line}, column ${context.column}:\n${err.message}\n\n` +
          `...${context.before}⚠️【${context.errorChar}】${context.after}...` +
          (errorDetails.hint ? `\n\n💡 ${errorDetails.hint}` : ''))
      } else {
        setError(err.message)
      }
      
      setOutput('')
      setStats({ chars: 0, lines: 0, size: '0 B' })
      setJsonAutoFixed(false)
      setOriginalJSON('')
      setFixedJSON('')
    }
  }, [indentSize, isCompact])

  // RSA Encryption Functions
  const generateRSAKeys = useCallback((keySize) => {
    try {
      setError('')
      setRsaOutput('Generating RSA key pair... Please wait.')
      
      // Generate key pair asynchronously
      setTimeout(() => {
        try {
          const rsa = forge.pki.rsa
          const keypair = rsa.generateKeyPair({ bits: parseInt(keySize), e: 0x10001 })
          
          const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey)
          const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)
          
          setRsaPublicKey(publicKeyPem)
          setRsaPrivateKey(privateKeyPem)
          setRsaOutput(`✅ RSA-${keySize} key pair generated successfully!\n\n🔑 Keys are displayed in the Key fields below.\n📋 Copy and save them securely.`)
          setError('')
        } catch (err) {
          setError('Key generation failed: ' + err.message)
          setRsaOutput('')
        }
      }, 100)
    } catch (err) {
      setError('Key generation failed: ' + err.message)
      setRsaOutput('')
    }
  }, [])

  const encryptRSA = useCallback((text, publicKeyPem) => {
    if (!text.trim()) {
      setRsaOutput('')
      setError('')
      return
    }
    
    if (!publicKeyPem.trim()) {
      setError('Public key is required for encryption')
      setRsaOutput('')
      return
    }

    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
      const encrypted = publicKey.encrypt(text, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create()
        }
      })
      const encryptedBase64 = forge.util.encode64(encrypted)
      setRsaOutput(encryptedBase64)
      setError('')
    } catch (err) {
      setError('Encryption failed: ' + err.message)
      setRsaOutput('')
    }
  }, [])

  const decryptRSA = useCallback((encryptedText, privateKeyPem) => {
    if (!encryptedText.trim()) {
      setRsaOutput('')
      setError('')
      return
    }
    
    if (!privateKeyPem.trim()) {
      setError('Private key is required for decryption')
      setRsaOutput('')
      return
    }

    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      const encrypted = forge.util.decode64(encryptedText)
      const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create()
        }
      })
      setRsaOutput(decrypted)
      setError('')
    } catch (err) {
      setError('Decryption failed: ' + err.message)
      setRsaOutput('')
    }
  }, [])

  const signMessage = useCallback((text, privateKeyPem) => {
    if (!text.trim()) {
      setRsaSignature('')
      setRsaOutput('')
      setError('')
      return
    }
    
    if (!privateKeyPem.trim()) {
      setError('Private key is required for signing')
      setRsaSignature('')
      setRsaOutput('')
      return
    }

    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      const md = forge.md.sha256.create()
      md.update(text, 'utf8')
      const signature = privateKey.sign(md)
      const signatureBase64 = forge.util.encode64(signature)
      setRsaSignature(signatureBase64)
      setRsaOutput(`✅ Message signed successfully!\n\n📝 Original Message:\n${text}\n\n✍️ Signature (Base64):\n${signatureBase64}`)
      setError('')
    } catch (err) {
      setError('Signing failed: ' + err.message)
      setRsaSignature('')
      setRsaOutput('')
    }
  }, [])

  const verifySignature = useCallback((text, signatureBase64, publicKeyPem) => {
    if (!text.trim() || !signatureBase64.trim()) {
      setRsaOutput('')
      setError('')
      return
    }
    
    if (!publicKeyPem.trim()) {
      setError('Public key is required for verification')
      setRsaOutput('')
      return
    }

    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
      const signature = forge.util.decode64(signatureBase64)
      const md = forge.md.sha256.create()
      md.update(text, 'utf8')
      const verified = publicKey.verify(md.digest().bytes(), signature)
      
      if (verified) {
        setRsaOutput(`✅ Signature is VALID!\n\nThe signature matches the message and was created with the corresponding private key.`)
      } else {
        setRsaOutput(`❌ Signature is INVALID!\n\nThe signature does not match the message or was not created with the corresponding private key.`)
      }
      setError('')
    } catch (err) {
      setError('Verification failed: ' + err.message)
      setRsaOutput('')
    }
  }, [])

  // Auto-format on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      switch (activeTool) {
        case 'json-formatter':
          formatJSON(input)
          break
        case 'json-parser':
          parseJSON(input)
          break
        case 'base64-image':
          base64ToImage(input)
          break
        case 'xml-formatter':
          formatXML(input)
          break
        case 'js-beautifier':
          formatJS(input)
          break
        case 'code-formatter':
          formatCode(input, codeFormatterLang)
          break
        case 'uuid-generator':
          // UUID generation is triggered manually by button click
          break
        case 'jwt-tool':
          if (jwtMode === 'decode') {
            decodeJWT(jwtDecodeInput)
          } else {
            encodeJWT(jwtEncodeInput)
          }
          break
        case 'timestamp-converter':
          if (timestampMode === 'to-date') {
            convertTimestamp(timestampToDateInput)
          } else {
            convertDateToTimestamp(dateToTimestampInput)
          }
          break
        case 'text-diff':
          compareDiff(diffText1, diffText2)
          break
        case 'hash-generator':
          generateHash(hashInput, hashAlgorithm)
          break
        case 'encoding-tool':
          encodeDecodeText(encodingInput, encodingType, encodingMode)
          break
        case 'case-converter':
          convertCase(caseInput)
          break
        case 'rsa-encryption':
          if (rsaMode === 'encrypt') {
            encryptRSA(rsaInput, rsaPublicKey)
          } else if (rsaMode === 'decrypt') {
            decryptRSA(rsaInput, rsaPrivateKey)
          } else if (rsaMode === 'sign') {
            signMessage(rsaInput, rsaPrivateKey)
          } else if (rsaMode === 'verify') {
            verifySignature(rsaInput, rsaSignature, rsaPublicKey)
          }
          break
        default:
          formatJSON(input)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [input, activeTool, indentSize, isCompact, jwtMode, timestampMode, jwtDecodeInput, jwtEncodeInput, timestampToDateInput, dateToTimestampInput, codeFormatterLang, diffText1, diffText2, hashInput, hashAlgorithm, encodingInput, encodingType, encodingMode, caseInput, rsaInput, rsaPublicKey, rsaPrivateKey, rsaMode, rsaSignature, encryptRSA, decryptRSA, signMessage, verifySignature])

  // Copy to clipboard
  const copyToClipboard = async () => {
    let textToCopy = output
    
    if (activeTool === 'jwt-tool') {
      textToCopy = jwtMode === 'decode' ? jwtDecodeOutput : jwtEncodeOutput
    } else if (activeTool === 'timestamp-converter') {
      textToCopy = timestampMode === 'to-date' ? timestampToDateOutput : dateToTimestampOutput
    } else if (activeTool === 'text-diff') {
      textToCopy = diffResult
    } else if (activeTool === 'hash-generator') {
      textToCopy = hashOutput
    } else if (activeTool === 'encoding-tool') {
      textToCopy = encodingOutput
    } else if (activeTool === 'aes-encryption') {
      textToCopy = aesOutput
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Clear all
  const clearAll = () => {
    setInput('')
    setOutput('')
    setError('')
    setStats({ chars: 0, lines: 0, size: '0 B' })
    setDiffText1('')
    setDiffText2('')
    setDiffResult('')
    setHashInput('')
    setHashOutput('')
    setEncodingInput('')
    setEncodingOutput('')
    setCaseInput('')
    setCaseResults({
      lowercase: '',
      uppercase: '',
      camelCase: '',
      pascalCase: '',
      snakeCase: '',
      kebabCase: '',
      constantCase: ''
    })
    setRsaPublicKey('')
    setRsaPrivateKey('')
    setRsaInput('')
    setRsaOutput('')
    setRsaSignature('')
  }

  // Download JSON
  const downloadJSON = () => {
    let blob, filename, extension
    let textToDownload = output
    
    if (activeTool === 'jwt-tool') {
      textToDownload = jwtMode === 'decode' ? jwtDecodeOutput : jwtEncodeOutput
    } else if (activeTool === 'timestamp-converter') {
      textToDownload = timestampMode === 'to-date' ? timestampToDateOutput : dateToTimestampOutput
    } else if (activeTool === 'hash-generator') {
      textToDownload = hashOutput
    } else if (activeTool === 'encoding-tool') {
      textToDownload = encodingOutput
    }
    
    switch (activeTool) {
      case 'json-formatter':
      case 'json-parser':
        blob = new Blob([textToDownload], { type: 'application/json' })
        filename = 'formatted.json'
        break
      case 'xml-formatter':
        blob = new Blob([textToDownload], { type: 'application/xml' })
        filename = 'formatted.xml'
        break
      case 'js-beautifier':
        blob = new Blob([textToDownload], { type: 'text/javascript' })
        filename = 'formatted.js'
        break
      case 'go-formatter':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'formatted.go'
        break
      case 'java-formatter':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'formatted.java'
        break
      case 'react-formatter':
        blob = new Blob([textToDownload], { type: 'text/javascript' })
        filename = 'formatted.jsx'
        break
      case 'python-formatter':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'formatted.py'
        break
      case 'rust-formatter':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'formatted.rs'
        break
      case 'uuid-generator':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'uuids.txt'
        break
      case 'jwt-tool':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = jwtMode === 'decode' ? 'decoded-jwt.json' : 'encoded-jwt.txt'
        break
      case 'timestamp-converter':
        blob = new Blob([textToDownload], { type: 'application/json' })
        filename = 'timestamp-conversion.json'
        break
      case 'text-diff':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'text-diff.txt'
        break
      case 'hash-generator':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'hash-output.txt'
        break
      case 'encoding-tool':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = encodingMode === 'encode' ? 'encoded.txt' : 'decoded.txt'
        break
      case 'rsa-encryption':
        blob = new Blob([textToDownload], { type: 'text/plain' })
        if (rsaMode === 'key-generator') {
          filename = 'rsa-keys.txt'
        } else if (rsaMode === 'encrypt') {
          filename = 'encrypted.txt'
        } else if (rsaMode === 'decrypt') {
          filename = 'decrypted.txt'
        } else if (rsaMode === 'sign') {
          filename = 'signature.txt'
        } else {
          filename = 'verification.txt'
        }
        break
      case 'base64-image':
        // For images, download the image itself
        if (textToDownload.startsWith('data:image')) {
          const link = document.createElement('a')
          link.href = textToDownload
          link.download = 'image.png'
          link.click()
          return
        }
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'base64.txt'
        break
      default:
        blob = new Blob([textToDownload], { type: 'text/plain' })
        filename = 'formatted.txt'
    }
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Upload JSON file
  const uploadJSON = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setInput(e.target?.result || '')
      }
      reader.readAsText(file)
    }
  }

  // Sample JSON
  const loadSample = () => {
    let sample = ''
    
    switch (activeTool) {
      case 'json-formatter':
        sample = JSON.stringify({
          "name": "DevTools Pro",
          "version": "1.0.0",
          "features": ["JSON Formatter", "XML Formatter", "JS Beautifier", "Base64 Converter"],
          "author": {
            "name": "Developer",
            "email": "dev@example.com",
            "social": {
              "github": "devtools-pro",
              "twitter": "@devtools"
            }
          },
          "isAwesome": true,
          "stats": {
            "users": 10000,
            "rating": 4.9,
            "downloads": 50000
          },
          "tags": ["tools", "developer", "formatter", "beautifier"]
        })
        break
      
      case 'json-parser':
        sample = JSON.stringify({
          "user": {
            "id": 12345,
            "profile": {
              "name": "John Doe",
              "email": "john@example.com",
              "address": {
                "city": "San Francisco",
                "country": "USA"
              }
            },
            "preferences": {
              "theme": "dark",
              "language": "en"
            }
          }
        }, null, 2)
        break
      
      case 'base64-image':
        // Small sample base64 image (red square)
        sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
        break
      
      case 'xml-formatter':
        sample = '<?xml version="1.0" encoding="UTF-8"?><bookstore><book category="web"><title lang="en">Learning XML</title><author>Erik T. Ray</author><year>2003</year><price>39.95</price></book><book category="programming"><title lang="en">JavaScript: The Good Parts</title><author>Douglas Crockford</author><year>2008</year><price>29.99</price></book></bookstore>'
        break
      
      case 'js-beautifier':
        sample = 'function calculateTotal(items){let total=0;for(let i=0;i<items.length;i++){total+=items[i].price*items[i].quantity;}return total;}const cart=[{name:"Laptop",price:999,quantity:1},{name:"Mouse",price:25,quantity:2}];console.log("Total:",calculateTotal(cart));'
        break
      
      case 'code-formatter':
        // Sample based on selected language
        switch (codeFormatterLang) {
          case 'go':
            sample = 'package main\nimport "fmt"\nfunc main(){fmt.Println("Hello, World!")}\nfunc add(a int, b int) int{return a+b}\ntype Person struct{Name string;Age int}'
            break
          case 'java':
            sample = 'public class HelloWorld{public static void main(String[] args){System.out.println("Hello, World!");int sum=add(5,3);System.out.println("Sum: "+sum);}public static int add(int a,int b){return a+b;}}'
            break
          case 'react':
            sample = 'import React from "react";function App(){const [count,setCount]=React.useState(0);return(<div><h1>Counter: {count}</h1><button onClick={()=>setCount(count+1)}>Increment</button></div>);}export default App;'
            break
          case 'python':
            sample = 'def calculate_total(items):\ntotal=0\nfor item in items:\ntotal+=item["price"]*item["quantity"]\nreturn total\nitems=[{"name":"Laptop","price":999,"quantity":1},{"name":"Mouse","price":25,"quantity":2}]\nprint("Total:",calculate_total(items))'
            break
          case 'rust':
            sample = 'fn main(){println!("Hello, World!");let sum=add(5,3);println!("Sum: {}",sum);}fn add(a:i32,b:i32)->i32{return a+b;}struct Person{name:String,age:u32}'
            break
        }
        break
      
      case 'uuid-generator':
        // UUID generator - set state and trigger generation
        setUuidVersion('v4')
        setUuidCount(5)
        // Generate directly here
        const sampleUUIDs = []
        for (let i = 0; i < 5; i++) {
          sampleUUIDs.push(uuidv4())
        }
        setOutput(sampleUUIDs.join('\n'))
        return
      
      case 'jwt-tool':
        if (jwtMode === 'decode') {
          sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MzI0NTY3ODksImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
          setJwtDecodeInput(sample)
        } else {
          sample = JSON.stringify({
            "sub": "1234567890",
            "name": "John Doe",
            "email": "john@example.com",
            "role": "user",
            "iat": Math.floor(Date.now() / 1000),
            "exp": Math.floor(Date.now() / 1000) + 3600
          }, null, 2)
          setJwtEncodeInput(sample)
        }
        return
      
      case 'timestamp-converter':
        if (timestampMode === 'to-date') {
          sample = String(Math.floor(Date.now() / 1000)) // Current timestamp in seconds
          setTimestampToDateInput(sample)
        } else {
          sample = new Date().toISOString()
          setDateToTimestampInput(sample)
        }
        return
      
      case 'text-diff':
        const text1 = `Hello World
This is line 2
This is line 3
Common line 4
Different line 5`
        
        const text2 = `Hello World
This is line 2 modified
This is line 3
Common line 4
Changed line 5`
        
        setDiffText1(text1)
        setDiffText2(text2)
        return
      
      case 'hash-generator':
        sample = 'Hello, this is a sample text to hash!'
        setHashInput(sample)
        return
      
      case 'encoding-tool':
        if (encodingMode === 'encode') {
          sample = 'Hello World! This is a sample text to encode. 你好世界 🌍'
        } else {
          // Provide encoded sample based on type
          switch (encodingType) {
            case 'Base64':
              sample = 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBzYW1wbGUgdGV4dCB0byBlbmNvZGUuIPkvaDlpb+S4lueVjCDwn4yN'
              break
            case 'Base32':
              sample = 'JBSWY3DPEBLW64TMMQQQ'
              break
            case 'Base58':
              sample = '2NEpo7TZRRrLZSi2U'
              break
            case 'Hex':
              sample = '48656c6c6f20576f726c6421'
              break
            case 'HTML':
              sample = '&lt;div&gt;Hello &amp; Welcome!&lt;/div&gt;'
              break
            case 'URL':
              sample = 'Hello%20World%21%20%F0%9F%8C%8D'
              break
            default:
              sample = 'SGVsbG8gV29ybGQh'
          }
        }
        setEncodingInput(sample)
        return
      
      case 'case-converter':
        sample = 'Hello World Example Text'
        setCaseInput(sample)
        return
      
      case 'rsa-encryption':
        if (rsaMode === 'key-generator') {
          // No sample needed for key generator
          setRsaInput('')
          setRsaOutput('Click "Generate Keys" button to create a new RSA key pair')
        } else if (rsaMode === 'encrypt') {
          sample = 'This is a secret message to encrypt using RSA!'
          setRsaInput(sample)
        } else if (rsaMode === 'decrypt') {
          sample = 'Paste your encrypted text here (Base64 format)'
          setRsaInput(sample)
        } else if (rsaMode === 'sign') {
          sample = 'This message will be signed with your private key'
          setRsaInput(sample)
        } else if (rsaMode === 'verify') {
          sample = 'Enter the original message that was signed'
          setRsaInput(sample)
        }
        return
      
      default:
        sample = JSON.stringify({
          "message": "Hello World",
          "timestamp": new Date().toISOString()
        })
    }
    
    setInput(sample)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Tool handlers with navigation
  const handleToolChange = (tool) => {
    const path = tool === 'json-formatter' ? '/' : `/${tool}`
    navigate(path)
    setInput('')
    setOutput('')
    setError('')
    setStats({ chars: 0, lines: 0, size: '0 B' })
  }

  // JSON Parser - extract values by path
  const parseJSON = useCallback((text, path = '') => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      const parsed = JSON.parse(text)
      let result = parsed
      
      if (path.trim()) {
        const keys = path.split('.').filter(k => k)
        for (const key of keys) {
          result = result[key]
          if (result === undefined) {
            throw new Error(`Path not found: ${path}`)
          }
        }
      }
      
      const formatted = JSON.stringify(result, null, indentSize)
      setOutput(formatted)
      setError('')
    } catch (err) {
      const errorDetails = getErrorDetails(text, err)
      const context = errorDetails ? getErrorContext(text, errorDetails.position) : null
      
      if (context) {
        const displayContext = highlightError(text, err.message, context.line, context.column, errorDetails.hint)
        setError(`❌ Error at line ${context.line}, column ${context.column}:\n${err.message}\n\n...${displayContext.before}⚠️【${displayContext.errorChar}】${displayContext.after}...${errorDetails.hint ? `\n\n💡 ${errorDetails.hint}` : ''}`)
      } else {
        highlightError(text, err.message, 1, 1)
        setError(`❌ ${err.message}`)
      }
      setOutput('')
    }
  }, [indentSize])

  // Base64 to Image
  const base64ToImage = useCallback((text) => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      // Remove data:image prefix if exists
      let base64 = text.trim()
      if (base64.startsWith('data:image')) {
        setOutput(base64)
      } else {
        setOutput(`data:image/png;base64,${base64}`)
      }
      setError('')
    } catch (err) {
      setError(err.message)
      setOutput('')
    }
  }, [])

  // XML Formatter
  const formatXML = useCallback((text) => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(text, 'text/xml')
      
      const errorNode = xmlDoc.querySelector('parsererror')
      if (errorNode) {
        throw new Error('Invalid XML')
      }

      const formatted = formatXMLString(text, indentSize)
      setOutput(formatted)
      setError('')
      
      const bytes = new Blob([formatted]).size
      const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
      setStats({
        chars: formatted.length,
        lines: formatted.split('\n').length,
        size
      })
    } catch (err) {
      // Try to find error position in XML
      const lines = text.split('\n')
      let errorLine = 1
      let errorColumn = 1
      
      // Look for unclosed tags or invalid syntax
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const openTags = (line.match(/</g) || []).length
        const closeTags = (line.match(/>/g) || []).length
        if (openTags > closeTags) {
          errorLine = i + 1
          errorColumn = line.lastIndexOf('<') + 1
          break
        }
      }
      
      const context = highlightError(text, err.message, errorLine, errorColumn, 'Check XML syntax, all tags must be properly closed')
      setError(`❌ XML Error at line ${errorLine}, column ${errorColumn}:\n${err.message}\n\n...${context.before}⚠️【${context.errorChar}】${context.after}...\n\n💡 Check XML syntax, all tags must be properly closed`)
      setOutput('')
    }
  }, [indentSize])

  // Helper function to format XML
  const formatXMLString = (xml, indent) => {
    let formatted = ''
    let indentLevel = 0
    const nodes = xml.split(/>\s*</)
    
    nodes.forEach((node, i) => {
      if (i > 0) node = '<' + node
      if (i < nodes.length - 1) node = node + '>'
      
      if (node.match(/^<\/\w/)) indentLevel--
      
      formatted += ' '.repeat(indentLevel * indent) + node + '\n'
      
      if (node.match(/^<\w[^>]*[^\/]>.*$/)) indentLevel++
    })
    
    return formatted.trim()
  }

  // JS Beautifier
  const formatJS = useCallback((text) => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      // Basic JS formatting (simple approach)
      let formatted = text
      formatted = formatted.replace(/;/g, ';\n')
      formatted = formatted.replace(/{/g, '{\n')
      formatted = formatted.replace(/}/g, '\n}')
      formatted = formatted.replace(/\n\s*\n/g, '\n')
      
      const lines = formatted.split('\n')
      let indentLevel = 0
      const result = lines.map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        if (trimmed.startsWith('}')) indentLevel--
        const indented = ' '.repeat(Math.max(0, indentLevel) * indentSize) + trimmed
        if (trimmed.endsWith('{')) indentLevel++
        
        return indented
      }).join('\n')
      
      setOutput(result)
      setError('')
      
      const bytes = new Blob([result]).size
      const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
      setStats({
        chars: result.length,
        lines: result.split('\n').length,
        size
      })
    } catch (err) {
      // Try to find error line
      const lines = text.split('\n')
      let errorLine = 1
      let errorColumn = 1
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const openBraces = (line.match(/{/g) || []).length
        const closeBraces = (line.match(/}/g) || []).length
        if (openBraces !== closeBraces) {
          errorLine = i + 1
          errorColumn = line.length > 0 ? line.length : 1
          break
        }
      }
      
      const context = highlightError(text, err.message, errorLine, errorColumn, 'Check braces {}, semicolons ;')
      setError(`❌ JavaScript Error at line ${errorLine}, column ${errorColumn}:\n${err.message}\n\n...${context.before}⚠️【${context.errorChar}】${context.after}...\n\n💡 Check braces {}, semicolons ;`)
      setOutput('')
    }
  }, [indentSize])

  // Unified Code Formatter for multiple languages
  const formatCode = useCallback((text, language) => {
    if (!text.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      let formatted = text
      let result = ''
      
      // Language-specific formatting
      switch (language) {
        case 'go':
          formatted = formatted.replace(/{/g, ' {\n')
          formatted = formatted.replace(/}/g, '\n}')
          formatted = formatted.replace(/\n\s*\n/g, '\n')
          
          const goLines = formatted.split('\n')
          let goIndent = 0
          result = goLines.map(line => {
            const trimmed = line.trim()
            if (!trimmed) return ''
            if (trimmed.startsWith('}')) goIndent--
            const indented = '\t'.repeat(Math.max(0, goIndent)) + trimmed
            if (trimmed.endsWith('{')) goIndent++
            return indented
          }).join('\n')
          break

        case 'java':
        case 'rust':
          formatted = formatted.replace(/{/g, ' {\n')
          formatted = formatted.replace(/}/g, '\n}')
          formatted = formatted.replace(/;/g, ';\n')
          formatted = formatted.replace(/\n\s*\n/g, '\n')
          
          const javaLines = formatted.split('\n')
          let javaIndent = 0
          result = javaLines.map(line => {
            const trimmed = line.trim()
            if (!trimmed) return ''
            if (trimmed.startsWith('}')) javaIndent--
            const indented = ' '.repeat(Math.max(0, javaIndent) * indentSize) + trimmed
            if (trimmed.endsWith('{')) javaIndent++
            return indented
          }).join('\n')
          break

        case 'react':
          formatted = formatted.replace(/;/g, ';\n')
          formatted = formatted.replace(/{/g, ' {\n')
          formatted = formatted.replace(/}/g, '\n}')
          formatted = formatted.replace(/>/g, '>\n')
          formatted = formatted.replace(/\n\s*\n/g, '\n')
          
          const reactLines = formatted.split('\n')
          let reactIndent = 0
          result = reactLines.map(line => {
            const trimmed = line.trim()
            if (!trimmed) return ''
            if (trimmed.startsWith('}') || trimmed.startsWith('</')) reactIndent--
            const indented = ' '.repeat(Math.max(0, reactIndent) * indentSize) + trimmed
            if (trimmed.endsWith('{') || (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>'))) reactIndent++
            return indented
          }).join('\n')
          break

        case 'python':
          const pythonLines = text.split('\n')
          let pythonIndent = 0
          result = pythonLines.map(line => {
            const trimmed = line.trim()
            if (!trimmed) return ''
            if (trimmed.startsWith('elif ') || trimmed.startsWith('else:') || 
                trimmed.startsWith('except') || trimmed.startsWith('finally:')) {
              pythonIndent = Math.max(0, pythonIndent - 1)
            }
            const indented = ' '.repeat(pythonIndent * indentSize) + trimmed
            if (trimmed.endsWith(':')) pythonIndent++
            return indented
          }).join('\n')
          break

        default:
          result = text
      }
      
      setOutput(result)
      setError('')
      updateStats(result)
    } catch (err) {
      const lines = text.split('\n')
      let errorLine = 1
      let errorColumn = 1
      let hint = ''
      
      // Language-specific error detection
      switch (language) {
        case 'go':
          hint = 'Go uses tabs for indentation'
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('func') && !lines[i].includes('{')) {
              errorLine = i + 1
              errorColumn = lines[i].length > 0 ? lines[i].length : 1
              break
            }
          }
          break
        case 'java':
          hint = 'Check Java syntax, braces {} and ;'
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const openBraces = (line.match(/{/g) || []).length
            const closeBraces = (line.match(/}/g) || []).length
            if (openBraces !== closeBraces) {
              errorLine = i + 1
              errorColumn = line.length > 0 ? line.length : 1
              break
            }
          }
          break
        case 'react':
          hint = 'Check JSX tags, must be properly closed'
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('<') && !lines[i].includes('>') && !lines[i].includes('</')) {
              errorLine = i + 1
              errorColumn = lines[i].indexOf('<') + 1
              break
            }
          }
          break
        case 'python':
          hint = 'Python uses indentation (whitespace) to define code blocks'
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().endsWith(':') && i < lines.length - 1 && lines[i + 1].trim() && !lines[i + 1].startsWith(' ')) {
              errorLine = i + 2
              errorColumn = 1
              break
            }
          }
          break
        case 'rust':
          hint = 'Check Rust syntax, braces {} and ;'
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const openBraces = (line.match(/{/g) || []).length
            const closeBraces = (line.match(/}/g) || []).length
            if (openBraces !== closeBraces) {
              errorLine = i + 1
              errorColumn = line.length > 0 ? line.length : 1
              break
            }
          }
          break
      }
      
      const context = highlightError(text, err.message, errorLine, errorColumn, hint)
      setError(`❌ ${language.charAt(0).toUpperCase() + language.slice(1)} Error at line ${errorLine}, column ${errorColumn}:\n${err.message}\n\n...${context.before}⚠️【${context.errorChar}】${context.after}...\n\n💡 ${hint}`)
      setOutput('')
    }
  }, [indentSize])

  // UUID Generator
  const generateUUID = useCallback((version = 'v4', count = 1) => {
    try {
      const uuids = []
      for (let i = 0; i < count; i++) {
        if (version === 'v4') {
          uuids.push(uuidv4())
        } else if (version === 'v1') {
          uuids.push(uuidv1())
        }
      }
      const result = uuids.join('\n')
      setOutput(result)
      setError('')
      updateStats(result)
    } catch (err) {
      setError(err.message)
      setOutput('')
    }
  }, [])

  // Hash Generator
  const generateHash = useCallback((text, algorithm) => {
    if (!text.trim()) {
      setHashOutput('')
      setError('')
      return
    }

    try {
      let hash = ''
      
      switch (algorithm) {
        case 'MD5':
          hash = CryptoJS.MD5(text).toString()
          break
        case 'SHA1':
          hash = CryptoJS.SHA1(text).toString()
          break
        case 'SHA256':
          hash = CryptoJS.SHA256(text).toString()
          break
        case 'SHA512':
          hash = CryptoJS.SHA512(text).toString()
          break
        default:
          throw new Error('Unknown hash algorithm')
      }
      
      setHashOutput(hash)
      setError('')
    } catch (err) {
      setError('Hash generation failed: ' + err.message)
      setHashOutput('')
    }
  }, [])

  // Encoding/Decoding Tool
  const encodeDecodeText = useCallback((text, type, mode) => {
    if (!text.trim()) {
      setEncodingOutput('')
      setError('')
      return
    }

    try {
      let result = ''
      
      if (mode === 'encode') {
        switch (type) {
          case 'Base64':
            result = btoa(unescape(encodeURIComponent(text)))
            break
          case 'Base32':
            const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
            const base32 = baseX(BASE32_ALPHABET)
            result = base32.encode(new TextEncoder().encode(text))
            break
          case 'Base58':
            const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
            const base58 = baseX(BASE58_ALPHABET)
            result = base58.encode(new TextEncoder().encode(text))
            break
          case 'Hex':
            result = Array.from(new TextEncoder().encode(text))
              .map(byte => byte.toString(16).padStart(2, '0'))
              .join('')
            break
          case 'HTML':
            result = text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
            break
          case 'URL':
            result = encodeURIComponent(text)
            break
          default:
            throw new Error('Unknown encoding type')
        }
      } else {
        // Decode
        switch (type) {
          case 'Base64':
            result = decodeURIComponent(escape(atob(text)))
            break
          case 'Base32':
            const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
            const base32 = baseX(BASE32_ALPHABET)
            result = new TextDecoder().decode(base32.decode(text))
            break
          case 'Base58':
            const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
            const base58 = baseX(BASE58_ALPHABET)
            result = new TextDecoder().decode(base58.decode(text))
            break
          case 'Hex':
            const bytes = text.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            result = new TextDecoder().decode(new Uint8Array(bytes))
            break
          case 'HTML':
            result = text
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
            break
          case 'URL':
            result = decodeURIComponent(text)
            break
          default:
            throw new Error('Unknown encoding type')
        }
      }
      
      setEncodingOutput(result)
      setError('')
    } catch (err) {
      setError(`${mode === 'encode' ? 'Encoding' : 'Decoding'} failed: ` + err.message)
      setEncodingOutput('')
    }
  }, [])

  // Case Converter
  const convertCase = useCallback((text) => {
    if (!text.trim()) {
      setCaseResults({
        lowercase: '',
        uppercase: '',
        camelCase: '',
        pascalCase: '',
        snakeCase: '',
        kebabCase: '',
        constantCase: ''
      })
      setError('')
      return
    }

    try {
      // Helper function to split text into words
      const getWords = (str) => {
        // Split by spaces, underscores, hyphens, and capital letters
        return str
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
          .split(/[\s_-]+/)
          .filter(word => word.length > 0)
      }

      const words = getWords(text)

      setCaseResults({
        lowercase: text.toLowerCase(),
        uppercase: text.toUpperCase(),
        camelCase: words.map((word, i) => 
          i === 0 
            ? word.toLowerCase() 
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(''),
        pascalCase: words.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(''),
        snakeCase: words.map(word => word.toLowerCase()).join('_'),
        kebabCase: words.map(word => word.toLowerCase()).join('-'),
        constantCase: words.map(word => word.toUpperCase()).join('_')
      })
      setError('')
    } catch (err) {
      setError('Case conversion failed: ' + err.message)
      setCaseResults({
        lowercase: '',
        uppercase: '',
        camelCase: '',
        pascalCase: '',
        snakeCase: '',
        kebabCase: '',
        constantCase: ''
      })
    }
  }, [])

  // JWT Decoder
  const decodeJWT = useCallback((token) => {
    if (!token.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      const decoded = jwtDecode(token)
      
      // Split JWT into parts
      const parts = token.split('.')
      const header = JSON.parse(atob(parts[0]))
      const payload = decoded
      
      const result = {
        header,
        payload,
        signature: parts[2] || 'No signature'
      }
      
      const formatted = JSON.stringify(result, null, 2)
      setOutput(formatted)
      setError('')
      updateStats(formatted)
    } catch (err) {
      setError('Invalid JWT token: ' + err.message)
      setOutput('')
    }
  }, [])

  // JWT Encoder (simple, without real signature)
  const encodeJWT = useCallback((payloadText) => {
    if (!payloadText.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      const payload = JSON.parse(payloadText)
      const header = { alg: "HS256", typ: "JWT" }
      
      const encodedHeader = btoa(JSON.stringify(header))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      
      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      
      const token = `${encodedHeader}.${encodedPayload}.UNSIGNED_TOKEN`
      setOutput(token)
      setError('')
      updateStats(token)
    } catch (err) {
      setError('Invalid JSON payload: ' + err.message)
      setOutput('')
    }
  }, [])

  // Timestamp Converter (Timestamp → Date)
  const convertTimestamp = useCallback((text) => {
    if (!text.trim()) {
      setTimestampToDateOutput('')
      setError('')
      return
    }

    try {
      const input = text.trim()
      
      // Check if input is a timestamp (number)
      if (!/^\d+$/.test(input)) {
        throw new Error('Invalid timestamp format. Expected a number (e.g., 1732377600 or 1732377600000)')
      }
      
      const timestamp = parseInt(input)
      // Auto-detect if it's in seconds or milliseconds
      const ts = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp
      const date = new Date(ts)
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp value')
      }
      
      const result = {
        'Unix Timestamp (seconds)': Math.floor(ts / 1000),
        'Unix Timestamp (milliseconds)': ts,
        'ISO 8601': date.toISOString(),
        'UTC': date.toUTCString(),
        'Local Time': date.toString(),
        'Date': date.toDateString(),
        'Time': date.toTimeString(),
        'Year': date.getFullYear(),
        'Month': date.getMonth() + 1,
        'Day': date.getDate(),
        'Hours': date.getHours(),
        'Minutes': date.getMinutes(),
        'Seconds': date.getSeconds(),
      }
      
      const formatted = JSON.stringify(result, null, 2)
      setTimestampToDateOutput(formatted)
      setError('')
      updateStats(formatted)
    } catch (err) {
      setError(err.message)
      setTimestampToDateOutput('')
    }
  }, [])

  // Convert Date to Timestamp
  const convertDateToTimestamp = useCallback((text) => {
    if (!text.trim()) {
      setDateToTimestampOutput('')
      setError('')
      return
    }

    try {
      const date = new Date(text.trim())
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format. Try: "2025-11-23" or "Nov 23, 2025 15:30:00"')
      }
      
      const result = {
        'Unix Timestamp (seconds)': Math.floor(date.getTime() / 1000),
        'Unix Timestamp (milliseconds)': date.getTime(),
        'ISO 8601': date.toISOString(),
        'UTC': date.toUTCString(),
        'Local Time': date.toString(),
        'Year': date.getFullYear(),
        'Month': date.getMonth() + 1,
        'Day': date.getDate(),
        'Hours': date.getHours(),
        'Minutes': date.getMinutes(),
        'Seconds': date.getSeconds(),
      }
      
      const formatted = JSON.stringify(result, null, 2)
      setDateToTimestampOutput(formatted)
      setError('')
      updateStats(formatted)
    } catch (err) {
      setError(err.message)
      setDateToTimestampOutput('')
    }
  }, [])

  // Get current timestamp
  const getCurrentTimestamp = useCallback(() => {
    const now = new Date()
    const timestamp = Math.floor(now.getTime() / 1000).toString()
    
    if (timestampMode === 'to-date') {
      setTimestampToDateInput(timestamp)
    } else {
      const nowStr = now.toISOString()
      setDateToTimestampInput(nowStr)
    }
  }, [timestampMode])

  // Text Diff/Compare function - highlights differences in editors
  const compareDiff = useCallback((text1, text2) => {
    if (!text1.trim() && !text2.trim()) {
      setDiffResult('')
      setError('')
      // Clear decorations
      if (inputEditorRef.current) {
        inputEditorRef.current.deltaDecorations(inputDecorations, [])
      }
      if (outputEditorRef.current) {
        outputEditorRef.current.deltaDecorations(outputDecorations, [])
      }
      return
    }

    try {
      const lines1 = text1.split('\n')
      const lines2 = text2.split('\n')
      const maxLines = Math.max(lines1.length, lines2.length)
      
      let diffCount = 0
      let sameCount = 0
      const text1Decorations = []
      const text2Decorations = []
      
      for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || ''
        const line2 = lines2[i] || ''
        
        if (line1 === line2) {
          sameCount++
        } else {
          diffCount++
          
          // Add red background decoration to different lines in text1
          if (i < lines1.length) {
            text1Decorations.push({
              range: {
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 1,
                endColumn: line1.length + 1
              },
              options: {
                isWholeLine: true,
                className: 'diff-removed-line',
                glyphMarginClassName: 'diff-removed-glyph'
              }
            })
          }
          
          // Add green background decoration to different lines in text2
          if (i < lines2.length) {
            text2Decorations.push({
              range: {
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 1,
                endColumn: line2.length + 1
              },
              options: {
                isWholeLine: true,
                className: 'diff-added-line',
                glyphMarginClassName: 'diff-added-glyph'
              }
            })
          }
        }
      }
      
      // Apply decorations to editors
      if (inputEditorRef.current) {
        const newDecorations = inputEditorRef.current.deltaDecorations(inputDecorations, text1Decorations)
        setInputDecorations(newDecorations)
      }
      
      if (outputEditorRef.current) {
        const newDecorations = outputEditorRef.current.deltaDecorations(outputDecorations, text2Decorations)
        setOutputDecorations(newDecorations)
      }
      
      const summary = `📊 Comparison: ${sameCount} identical lines, ${diffCount} different lines (${((sameCount / maxLines) * 100).toFixed(1)}% match)`
      setDiffResult(summary)
      setError('')
    } catch (err) {
      setError('Error comparing texts: ' + err.message)
      setDiffResult('')
    }
  }, [inputDecorations, outputDecorations])

  // Helper to update stats
  const updateStats = (text) => {
    const bytes = new Blob([text]).size
    const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
    setStats({
      chars: text.length,
      lines: text.split('\n').length,
      size
    })
  }

  return (
    <div className={`app ${theme === 'light' ? 'light' : 'dark'}`}>
      {/* SEO Head - Dynamic meta tags */}
      <SEOHead 
        title={currentSEO.title}
        description={currentSEO.description}
        keywords={currentSEO.keywords}
        canonical={currentSEO.canonical}
      />
      
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <Sparkles className="logo-icon" />
          <h1>DevTools Pro</h1>
          <span className="badge">v1.0</span>
        </div>

        <div className="header-right">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Navigation Menu */}
      <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTool === 'json-formatter' ? 'active' : ''}`}
            onClick={() => handleToolChange('json-formatter')}
          >
            <span className="nav-icon">{ }</span>
            <span>JSON Beautifier</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'json-parser' ? 'active' : ''}`}
            onClick={() => handleToolChange('json-parser')}
          >
            <span className="nav-icon">📋</span>
            <span>JSON Parser</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'base64-image' ? 'active' : ''}`}
            onClick={() => handleToolChange('base64-image')}
          >
            <span className="nav-icon">🖼️</span>
            <span>Base64 to Image</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'xml-formatter' ? 'active' : ''}`}
            onClick={() => handleToolChange('xml-formatter')}
          >
            <span className="nav-icon">📄</span>
            <span>XML Formatter</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'js-beautifier' ? 'active' : ''}`}
            onClick={() => handleToolChange('js-beautifier')}
          >
            <span className="nav-icon">✨</span>
            <span>JS Beautifier</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'code-formatter' ? 'active' : ''}`}
            onClick={() => handleToolChange('code-formatter')}
          >
            <span className="nav-icon">💻</span>
            <span>Code Formatter</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'uuid-generator' ? 'active' : ''}`}
            onClick={() => handleToolChange('uuid-generator')}
          >
            <span className="nav-icon">🔑</span>
            <span>UUID Generator</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'jwt-tool' ? 'active' : ''}`}
            onClick={() => handleToolChange('jwt-tool')}
          >
            <span className="nav-icon">🔐</span>
            <span>JWT Tool</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'timestamp-converter' ? 'active' : ''}`}
            onClick={() => handleToolChange('timestamp-converter')}
          >
            <span className="nav-icon">⏰</span>
            <span>Timestamp Converter</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'text-diff' ? 'active' : ''}`}
            onClick={() => handleToolChange('text-diff')}
          >
            <span className="nav-icon">🔀</span>
            <span>Text Diff</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'hash-generator' ? 'active' : ''}`}
            onClick={() => handleToolChange('hash-generator')}
          >
            <span className="nav-icon">🔒</span>
            <span>Hash Generator</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'encoding-tool' ? 'active' : ''}`}
            onClick={() => handleToolChange('encoding-tool')}
          >
            <span className="nav-icon">🔤</span>
            <span>Encoding</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'case-converter' ? 'active' : ''}`}
            onClick={() => handleToolChange('case-converter')}
          >
            <span className="nav-icon">🔡</span>
            <span>Case Converter</span>
          </button>
          <button 
            className={`nav-item ${activeTool === 'rsa-encryption' ? 'active' : ''}`}
            onClick={() => handleToolChange('rsa-encryption')}
          >
            <span className="nav-icon">🔐</span>
            <span>RSA Encryption</span>
          </button>
        </nav>

      {/* Controls */}
      <div className="controls">
        <button className="sample-btn" onClick={loadSample}>
          <Sparkles size={16} />
          Load Sample
        </button>

        <label className="icon-btn" title="Upload file">
          <Upload size={20} />
          <input type="file" accept=".json" onChange={uploadJSON} style={{ display: 'none' }} />
        </label>
        <button className="icon-btn" onClick={downloadJSON} disabled={!output} title="Download">
          <Download size={20} />
        </button>
        <button className="icon-btn" onClick={clearAll} title="Clear all">
          <RotateCcw size={20} />
        </button>
        
        <div className="control-group">
          <label>Indent:</label>
          <select value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
        </div>

        <div className="control-group">
          <button 
            className={`toggle-btn ${isCompact ? 'active' : ''}`}
            onClick={() => setIsCompact(!isCompact)}
          >
            {isCompact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            {isCompact ? 'Compact' : 'Formatted'}
          </button>
        </div>

        {/* Stats */}
        <div className="stats">
          <span className="stat-item">{stats.lines} lines</span>
          <span className="stat-item">{stats.chars} chars</span>
          <span className="stat-item">{stats.size}</span>
        </div>

        {/* Status */}
        <div className="status">
          {error ? (
            <div className="status-error">
              <XCircle size={16} />
              <span>Invalid JSON</span>
            </div>
          ) : output ? (
            <div className="status-success">
              <CheckCircle2 size={16} />
              <span>Valid JSON</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Editors */}
      <div className="editor-container">
        <div className="editor-panel">
          <div className="panel-header">
            <h3>
              {activeTool === 'json-formatter' && 'Input JSON'}
              {activeTool === 'json-parser' && 'JSON Input'}
              {activeTool === 'base64-image' && 'Base64 String'}
              {activeTool === 'xml-formatter' && 'Input XML'}
              {activeTool === 'js-beautifier' && 'Input JavaScript'}
              {activeTool === 'code-formatter' && `Input Code (${codeFormatterLang.charAt(0).toUpperCase() + codeFormatterLang.slice(1)})`}
              {activeTool === 'uuid-generator' && 'UUID Options'}
              {activeTool === 'jwt-tool' && (jwtMode === 'decode' ? 'JWT Token (Decode)' : 'JWT Payload (Encode)')}
              {activeTool === 'timestamp-converter' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {timestampMode === 'to-date' ? (
                    <>
                      <Clock size={16} />
                      <span>Unix Timestamp Input</span>
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      <span>Date String Input</span>
                    </>
                  )}
                </span>
              )}
              {activeTool === 'text-diff' && 'Text 1 (Original)'}
              {activeTool === 'hash-generator' && 'Text Input'}
              {activeTool === 'encoding-tool' && (encodingMode === 'encode' ? 'Text to Encode' : 'Text to Decode')}
              {activeTool === 'case-converter' && 'Text Input'}
              {activeTool === 'rsa-encryption' && 'RSA Encryption / Decryption / Signing'}
            </h3>
            {activeTool !== 'uuid-generator' && activeTool !== 'jwt-tool' && activeTool !== 'timestamp-converter' && activeTool !== 'text-diff' && activeTool !== 'hash-generator' && activeTool !== 'encoding-tool' && activeTool !== 'case-converter' && activeTool !== 'rsa-encryption' && (
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search..."
                  value={inputSearchText}
                  onChange={(e) => {
                    setInputSearchText(e.target.value)
                    performInputSearch(e.target.value)
                  }}
                  className="search-input"
                />
                {inputSearchResults.total > 0 && (
                  <div className="search-nav">
                    <span className="search-count">{inputSearchResults.current}/{inputSearchResults.total}</span>
                    <button onClick={() => navigateInputSearch('prev')} className="search-btn">▲</button>
                    <button onClick={() => navigateInputSearch('next')} className="search-btn">▼</button>
                  </div>
                )}
              </div>
            )}
            {activeTool === 'code-formatter' && (
              <div className="language-selector-container">
                <div className="language-selector-group">
                  {[
                    { value: 'go', label: 'Go', icon: '🔵' },
                    { value: 'java', label: 'Java', icon: '☕' },
                    { value: 'react', label: 'React', icon: '⚛️' },
                    { value: 'python', label: 'Python', icon: '🐍' },
                    { value: 'rust', label: 'Rust', icon: '🦀' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      className={`language-btn ${codeFormatterLang === lang.value ? 'active' : ''}`}
                      onClick={() => {
                        setCodeFormatterLang(lang.value)
                        formatCode(input, lang.value)
                      }}
                      title={`Format as ${lang.label}`}
                    >
                      <span className="language-icon">{lang.icon}</span>
                      <span className="language-label">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeTool === 'jwt-tool' && (
              <div className="mode-toggle">
                <button 
                  className={`toggle-btn ${jwtMode === 'decode' ? 'active' : ''}`}
                  onClick={() => {
                    setJwtMode('decode')
                    setInput('')
                    setOutput('')
                  }}
                >
                  Decode
                </button>
                <button 
                  className={`toggle-btn ${jwtMode === 'encode' ? 'active' : ''}`}
                  onClick={() => {
                    setJwtMode('encode')
                    setInput('')
                    setOutput('')
                  }}
                >
                  Encode
                </button>
              </div>
            )}
            {activeTool === 'timestamp-converter' && (
              <div className="mode-toggle timestamp-toggle">
                <button 
                  className="sample-btn"
                  onClick={getCurrentTimestamp}
                  style={{ marginRight: '1rem' }}
                >
                  <Sparkles size={16} />
                  Current Time
                </button>
                <button 
                  className={`toggle-btn ${timestampMode === 'to-date' ? 'active' : ''}`}
                  onClick={() => {
                    setTimestampMode('to-date')
                  }}
                >
                  <Clock size={16} />
                  <span>Timestamp</span>
                  <ArrowRight size={14} />
                  <Calendar size={16} />
                  <span>Date</span>
                </button>
                <button 
                  className={`toggle-btn ${timestampMode === 'to-timestamp' ? 'active' : ''}`}
                  onClick={() => {
                    setTimestampMode('to-timestamp')
                  }}
                >
                  <Calendar size={16} />
                  <span>Date</span>
                  <ArrowRight size={14} />
                  <Clock size={16} />
                  <span>Timestamp</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Special UI for UUID Generator */}
          {activeTool === 'uuid-generator' ? (
            <div className="uuid-generator-panel">
              <div className="uuid-controls">
                <div className="control-group">
                  <label>UUID Version:</label>
                  <select 
                    value={uuidVersion} 
                    onChange={(e) => {
                      setUuidVersion(e.target.value)
                      generateUUID(e.target.value, uuidCount)
                    }}
                  >
                    <option value="v4">Version 4 (Random)</option>
                    <option value="v1">Version 1 (Timestamp)</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>Count:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={uuidCount}
                    onChange={(e) => {
                      const count = Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                      setUuidCount(count)
                      generateUUID(uuidVersion, count)
                    }}
                    style={{ width: '80px' }}
                  />
                </div>
                <button 
                  className="sample-btn"
                  onClick={() => {
                    generateUUID(uuidVersion, uuidCount)
                  }}
                >
                  <Sparkles size={16} />
                  Generate
                </button>
              </div>
            </div>
          ) : activeTool === 'timestamp-converter' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={timestampMode === 'to-date' ? timestampToDateInput : dateToTimestampInput}
              onChange={(value) => {
                if (timestampMode === 'to-date') {
                  setTimestampToDateInput(value || '')
                } else {
                  setDateToTimestampInput(value || '')
                }
              }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                placeholder: timestampMode === 'to-date' 
                  ? 'Enter Unix timestamp (e.g., 1732377600 or 1732377600000)' 
                  : 'Enter date string (e.g., "2025-11-23" or "Nov 23, 2025 15:30:00")'
              }}
            />
          ) : activeTool === 'jwt-tool' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={jwtMode === 'decode' ? jwtDecodeInput : jwtEncodeInput}
              onChange={(value) => {
                if (jwtMode === 'decode') {
                  setJwtDecodeInput(value || '')
                } else {
                  setJwtEncodeInput(value || '')
                }
              }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 }
              }}
            />
          ) : activeTool === 'text-diff' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={diffText1}
              onChange={(value) => setDiffText1(value || '')}
              onMount={(editor) => { inputEditorRef.current = editor }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                glyphMargin: true
              }}
            />
          ) : activeTool === 'hash-generator' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={hashInput}
              onChange={(value) => setHashInput(value || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 }
              }}
            />
          ) : activeTool === 'encoding-tool' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={encodingInput}
              onChange={(value) => setEncodingInput(value || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 }
              }}
            />
          ) : activeTool === 'case-converter' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={caseInput}
              onChange={(value) => setCaseInput(value || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 }
              }}
            />
          ) : activeTool === 'rsa-encryption' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', padding: '2rem', overflow: 'auto' }}>
              {/* Mode Selector */}
              <div className="rsa-mode-selector">
                <button 
                  className={`rsa-mode-btn ${rsaMode === 'key-generator' ? 'active' : ''}`}
                  onClick={() => setRsaMode('key-generator')}
                >
                  🔑 Key Generator
                </button>
                <button 
                  className={`rsa-mode-btn ${rsaMode === 'encrypt' ? 'active' : ''}`}
                  onClick={() => setRsaMode('encrypt')}
                >
                  🔒 Encryption
                </button>
                <button 
                  className={`rsa-mode-btn ${rsaMode === 'decrypt' ? 'active' : ''}`}
                  onClick={() => setRsaMode('decrypt')}
                >
                  🔓 Decryption
                </button>
                <button 
                  className={`rsa-mode-btn ${rsaMode === 'sign' ? 'active' : ''}`}
                  onClick={() => setRsaMode('sign')}
                >
                  ✍️ Sign Message
                </button>
                <button 
                  className={`rsa-mode-btn ${rsaMode === 'verify' ? 'active' : ''}`}
                  onClick={() => setRsaMode('verify')}
                >
                  ✅ Verify Signature
                </button>
              </div>

              {/* Key Generator Mode */}
              {rsaMode === 'key-generator' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                      Key Size:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className={`rsa-keysize-btn ${rsaKeySize === '1024' ? 'active' : ''}`}
                        onClick={() => setRsaKeySize('1024')}
                      >
                        1024 bits
                      </button>
                      <button 
                        className={`rsa-keysize-btn ${rsaKeySize === '2048' ? 'active' : ''}`}
                        onClick={() => setRsaKeySize('2048')}
                      >
                        2048 bits (Recommended)
                      </button>
                      <button 
                        className={`rsa-keysize-btn ${rsaKeySize === '4096' ? 'active' : ''}`}
                        onClick={() => setRsaKeySize('4096')}
                      >
                        4096 bits
                      </button>
                    </div>
                  </div>
                  <button 
                    className="rsa-generate-btn"
                    onClick={() => generateRSAKeys(rsaKeySize)}
                  >
                    🔑 Generate RSA-{rsaKeySize} Key Pair
                  </button>
                </div>
              )}

              {/* Public Key Input (for encrypt/verify) */}
              {(rsaMode === 'encrypt' || rsaMode === 'verify') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Public Key (PEM format):
                  </label>
                  <textarea
                    className="rsa-key-textarea"
                    value={rsaPublicKey}
                    onChange={(e) => setRsaPublicKey(e.target.value)}
                    placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                    rows={6}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid var(--border)',
                      background: 'var(--editor-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {/* Private Key Input (for decrypt/sign) */}
              {(rsaMode === 'decrypt' || rsaMode === 'sign') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Private Key (PEM format):
                  </label>
                  <textarea
                    className="rsa-key-textarea"
                    value={rsaPrivateKey}
                    onChange={(e) => setRsaPrivateKey(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    rows={6}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid var(--border)',
                      background: 'var(--editor-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {/* Signature Input (for verify mode) */}
              {rsaMode === 'verify' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Signature (Base64):
                  </label>
                  <textarea
                    className="rsa-signature-textarea"
                    value={rsaSignature}
                    onChange={(e) => setRsaSignature(e.target.value)}
                    placeholder="Enter the signature in Base64 format..."
                    rows={4}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid var(--border)',
                      background: 'var(--editor-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {/* Text Input (for all modes except key-generator) */}
              {rsaMode !== 'key-generator' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '400px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {rsaMode === 'encrypt' ? 'Text to Encrypt:' : 
                     rsaMode === 'decrypt' ? 'Encrypted Text (Base64):' : 
                     rsaMode === 'sign' ? 'Message to Sign:' : 
                     'Original Message:'}
                  </label>
                  <Editor
                    height="400px"
                    defaultLanguage="plaintext"
                    value={rsaInput}
                    onChange={(value) => setRsaInput(value || '')}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'off',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      padding: { top: 12, bottom: 12 }
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
          <Editor
            height="100%"
            defaultLanguage={
              activeTool === 'xml-formatter' ? 'xml' :
              activeTool === 'js-beautifier' ? 'javascript' :
              activeTool === 'base64-image' ? 'plaintext' :
              activeTool === 'code-formatter' ? (
                codeFormatterLang === 'react' ? 'javascript' :
                codeFormatterLang === 'python' ? 'python' :
                codeFormatterLang
              ) :
              'json'
            }
            value={input}
            onChange={(value) => setInput(value || '')}
            onMount={(editor) => { inputEditorRef.current = editor }}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: indentSize,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 }
            }}
          />
          )}
        </div>

        {/* Hash Algorithm Selector */}
        {activeTool === 'hash-generator' && (
          <div className="hash-selector-container">
            <div className="hash-selector-group">
              {['MD5', 'SHA1', 'SHA256', 'SHA512'].map((algo) => (
                <button
                  key={algo}
                  className={`hash-btn ${hashAlgorithm === algo ? 'active' : ''}`}
                  onClick={() => setHashAlgorithm(algo)}
                >
                  <span className="hash-label">{algo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Encoding Type & Mode Selector */}
        {activeTool === 'encoding-tool' && (
          <div className="encoding-selector-container">
            <div className="encoding-mode-toggle">
              <button
                className={`mode-btn ${encodingMode === 'encode' ? 'active' : ''}`}
                onClick={() => setEncodingMode('encode')}
              >
                ⬆️ Encode
              </button>
              <button
                className={`mode-btn ${encodingMode === 'decode' ? 'active' : ''}`}
                onClick={() => setEncodingMode('decode')}
              >
                ⬇️ Decode
              </button>
            </div>
            <div className="encoding-type-group">
              {['Base64', 'Base32', 'Base58', 'Hex', 'HTML', 'URL'].map((type) => (
                <button
                  key={type}
                  className={`encoding-btn ${encodingType === type ? 'active' : ''}`}
                  onClick={() => setEncodingType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="divider"></div>

        <div className="editor-panel">
          <div className="panel-header">
            <h3>
              {activeTool === 'json-formatter' && 'Formatted Output'}
              {activeTool === 'json-parser' && 'Parsed Result'}
              {activeTool === 'base64-image' && 'Image Preview'}
              {activeTool === 'xml-formatter' && 'Formatted XML'}
              {activeTool === 'js-beautifier' && 'Beautified JavaScript'}
              {activeTool === 'code-formatter' && `Formatted ${codeFormatterLang.charAt(0).toUpperCase() + codeFormatterLang.slice(1)}`}
              {activeTool === 'uuid-generator' && 'Generated UUIDs'}
              {activeTool === 'jwt-tool' && (jwtMode === 'decode' ? 'Decoded JWT' : 'Encoded JWT Token')}
              {activeTool === 'timestamp-converter' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {timestampMode === 'to-date' ? (
                    <>
                      <Calendar size={16} />
                      <span>Date & Time Result</span>
                    </>
                  ) : (
                    <>
                      <Clock size={16} />
                      <span>Timestamp Result</span>
                    </>
                  )}
                </span>
              )}
              {activeTool === 'text-diff' && 'Text 2 (Modified)'}
              {activeTool === 'hash-generator' && `Hash Output (${hashAlgorithm})`}
              {activeTool === 'encoding-tool' && `${encodingMode === 'encode' ? 'Encoded' : 'Decoded'} Result (${encodingType})`}
              {activeTool === 'case-converter' && 'All Case Transformations'}
              {activeTool === 'rsa-encryption' && `${rsaMode === 'key-generator' ? 'Generated Keys' : rsaMode === 'encrypt' ? 'Encrypted Data' : rsaMode === 'decrypt' ? 'Decrypted Data' : rsaMode === 'sign' ? 'Signature' : 'Verification Result'}`}
            </h3>
            {activeTool !== 'uuid-generator' && activeTool !== 'jwt-tool' && activeTool !== 'timestamp-converter' && activeTool !== 'base64-image' && activeTool !== 'text-diff' && activeTool !== 'hash-generator' && activeTool !== 'encoding-tool' && activeTool !== 'case-converter' && activeTool !== 'rsa-encryption' && (
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search..."
                  value={outputSearchText}
                  onChange={(e) => {
                    setOutputSearchText(e.target.value)
                    performOutputSearch(e.target.value)
                  }}
                  className="search-input"
                />
                {outputSearchResults.total > 0 && (
                  <div className="search-nav">
                    <span className="search-count">{outputSearchResults.current}/{outputSearchResults.total}</span>
                    <button onClick={() => navigateOutputSearch('prev')} className="search-btn">▲</button>
                    <button onClick={() => navigateOutputSearch('next')} className="search-btn">▼</button>
                  </div>
                )}
              </div>
            )}
            <button 
              className="copy-btn"
              onClick={copyToClipboard}
              disabled={
                activeTool === 'jwt-tool' 
                  ? (jwtMode === 'decode' ? !jwtDecodeOutput : !jwtEncodeOutput)
                  : activeTool === 'timestamp-converter'
                  ? (timestampMode === 'to-date' ? !timestampToDateOutput : !dateToTimestampOutput)
                  : activeTool === 'hash-generator'
                  ? !hashOutput
                  : activeTool === 'encoding-tool'
                  ? !encodingOutput
                  : !output
              }
            >
              {copySuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
          
          {activeTool === 'base64-image' && output ? (
            <div className="image-preview">
              <img src={output} alt="Base64 Preview" onError={() => setError('Invalid Base64 image')} />
            </div>
          ) : activeTool === 'hash-generator' ? (
            <div className="hash-output-display">
              <div className={`hash-value ${!hashOutput ? 'empty' : ''}`}>
                {hashOutput ? (
                  <>
                    <div>{hashOutput}</div>
                    <div className="hash-info">
                      {hashAlgorithm} • {hashOutput.length} characters • {Math.ceil(hashOutput.length / 2)} bytes
                    </div>
                  </>
                ) : (
                  'Enter text above to generate hash...'
                )}
              </div>
            </div>
          ) : activeTool === 'encoding-tool' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={encodingOutput}
              onChange={(value) => setEncodingOutput(value || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                readOnly: true
              }}
            />
          ) : activeTool === 'case-converter' ? (
            <div className="case-results-grid">
              {[
                { label: 'lowercase', value: caseResults.lowercase, desc: 'all letters lowercase' },
                { label: 'UPPERCASE', value: caseResults.uppercase, desc: 'ALL LETTERS UPPERCASE' },
                { label: 'camelCase', value: caseResults.camelCase, desc: 'first word lowercase, rest capitalized' },
                { label: 'PascalCase', value: caseResults.pascalCase, desc: 'All Words Capitalized' },
                { label: 'snake_case', value: caseResults.snakeCase, desc: 'words_separated_by_underscores' },
                { label: 'kebab-case', value: caseResults.kebabCase, desc: 'words-separated-by-hyphens' },
                { label: 'CONSTANT_CASE', value: caseResults.constantCase, desc: 'UPPERCASE_WITH_UNDERSCORES' }
              ].map((caseType) => (
                <div key={caseType.label} className="case-result-box">
                  <div className="case-label">{caseType.label}</div>
                  <div className="case-value">
                    {caseType.value || <span className="placeholder">Enter text to convert...</span>}
                  </div>
                  <div className="case-desc">{caseType.desc}</div>
                  {caseType.value && (
                    <button
                      className="case-copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(caseType.value)
                        setCopySuccess(true)
                        setTimeout(() => setCopySuccess(false), 1000)
                      }}
                      title="Copy this case"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : activeTool === 'rsa-encryption' ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', overflow: 'auto' }}>
              {/* Display Generated Keys */}
              {rsaMode === 'key-generator' && rsaPublicKey && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Public Key:</label>
                      <button
                        className="mini-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(rsaPublicKey)
                          setCopySuccess(true)
                          setTimeout(() => setCopySuccess(false), 1000)
                        }}
                        title="Copy Public Key"
                      >
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={rsaPublicKey}
                      rows={8}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid var(--border)',
                        background: 'var(--editor-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#ef4444' }}>Private Key (Keep Secret!):</label>
                      <button
                        className="mini-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(rsaPrivateKey)
                          setCopySuccess(true)
                          setTimeout(() => setCopySuccess(false), 1000)
                        }}
                        title="Copy Private Key"
                      >
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={rsaPrivateKey}
                      rows={15}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid var(--border)',
                        background: 'var(--editor-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Display Output for other modes */}
              {rsaMode !== 'key-generator' && (
                <Editor
                  height="100%"
                  defaultLanguage="plaintext"
                  value={rsaOutput}
                  onMount={(editor) => { outputEditorRef.current = editor }}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                    readOnly: true
                  }}
                />
              )}
            </div>
          ) : activeTool === 'text-diff' ? (
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={diffText2}
              onChange={(value) => setDiffText2(value || '')}
              onMount={(editor) => { outputEditorRef.current = editor }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                glyphMargin: true
              }}
            />
          ) : (
            <Editor
              height="100%"
              defaultLanguage={
                activeTool === 'xml-formatter' ? 'xml' :
                activeTool === 'js-beautifier' ? 'javascript' :
                activeTool === 'code-formatter' ? (
                  codeFormatterLang === 'react' ? 'javascript' :
                  codeFormatterLang === 'python' ? 'python' :
                  codeFormatterLang
                ) :
                'json'
              }
              value={
                activeTool === 'jwt-tool' 
                  ? (jwtMode === 'decode' ? jwtDecodeOutput : jwtEncodeOutput)
                  : activeTool === 'timestamp-converter'
                  ? (timestampMode === 'to-date' ? timestampToDateOutput : dateToTimestampOutput)
                  : output
              }
              onMount={(editor) => { outputEditorRef.current = editor }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                folding: true,
                showFoldingControls: 'always',
                foldingStrategy: 'indentation',
                foldingHighlight: true
              }}
            />
          )}
        </div>
      </div>

      {/* Diff Summary - Show below editors for text-diff */}
      {activeTool === 'text-diff' && diffResult && (
        <div className="diff-summary">
          <CheckCircle2 size={16} />
          <span>{diffResult}</span>
        </div>
      )}

      {/* How to Use Guide - Positioned between editors and error */}
      <div className="usage-guide">
        {activeTool === 'json-formatter' && (
          <div className="guide-content">
            <h2>📚 How to Use JSON Beautifier</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Format and beautify JSON data with proper indentation, making it easy to read and understand. Validate JSON syntax and fix common errors automatically.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste your JSON data into the input panel on the left</li>
                <li>The tool automatically formats and validates your JSON</li>
                <li>Choose indent size (2, 4, or 8 spaces) from the controls</li>
                <li>Toggle between formatted and compact mode</li>
                <li>Copy the formatted result or download as a file</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Input (minified):</strong>
                  <code>{`{"name":"John","age":30,"city":"New York"}`}</code>
                </div>
                <div className="example-col">
                  <strong>Output (beautified):</strong>
                  <code>{`{
  "name": "John",
  "age": 30,
  "city": "New York"
}`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'json-parser' && (
          <div className="guide-content">
            <h2>📚 How to Use JSON Parser</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Parse and validate JSON data, showing detailed structure with data types, array lengths, and object properties. Perfect for analyzing complex JSON structures.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste your JSON data into the input panel</li>
                <li>View parsed structure with type annotations</li>
                <li>See array lengths and object keys count</li>
                <li>Identify data types for each field</li>
                <li>Use for debugging and understanding JSON structure</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Input:</strong>
                  <code>{`{"users":[{"name":"Alice","active":true}]}`}</code>
                </div>
                <div className="example-col">
                  <strong>Parsed Output:</strong>
                  <code>{`users: Array(1)
  [0]: Object
    name: "Alice" (string)
    active: true (boolean)`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'xml-formatter' && (
          <div className="guide-content">
            <h2>📚 How to Use XML Formatter</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Format and beautify XML documents with proper indentation and syntax highlighting. Validate XML structure and detect errors.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste your XML content into the input panel</li>
                <li>The tool automatically validates and formats your XML</li>
                <li>Adjust indent size for your preferred style</li>
                <li>View formatted XML with proper hierarchy</li>
                <li>Copy or download the formatted XML</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Input (minified):</strong>
                  <code>{`<root><user><name>John</name></user></root>`}</code>
                </div>
                <div className="example-col">
                  <strong>Output (formatted):</strong>
                  <code>{`<root>
  <user>
    <name>John</name>
  </user>
</root>`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'js-beautifier' && (
          <div className="guide-content">
            <h2>📚 How to Use JS Beautifier</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Format and beautify JavaScript code with proper indentation, spacing, and structure. Makes minified or messy code readable.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste your JavaScript code into the input panel</li>
                <li>Code is automatically formatted with proper indentation</li>
                <li>Choose your preferred indent size</li>
                <li>Toggle compact mode for condensed output</li>
                <li>Use search to find specific code patterns</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Input (minified):</strong>
                  <code>{`function hello(){console.log("Hello");}`}</code>
                </div>
                <div className="example-col">
                  <strong>Output (beautified):</strong>
                  <code>{`function hello() {
  console.log("Hello");
}`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'code-formatter' && (
          <div className="guide-content">
            <h2>📚 How to Use Code Formatter</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Universal code formatter supporting multiple programming languages: Go, Java, React/JSX, Python, and Rust. Format code with proper indentation and structure.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Select your programming language from the language selector</li>
                <li>Paste your code into the input panel</li>
                <li>Code is automatically formatted based on language syntax</li>
                <li>Adjust indent size (Go uses tabs, others use spaces)</li>
                <li>Switch between languages without losing your code</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Supported Languages:</h3>
              <ul>
                <li><strong>🔵 Go:</strong> Formats with tabs, handles packages and functions</li>
                <li><strong>☕ Java:</strong> Formats classes, methods, and imports</li>
                <li><strong>⚛️ React/JSX:</strong> Formats components with JSX syntax</li>
                <li><strong>🐍 Python:</strong> Indentation-based formatting for Python code</li>
                <li><strong>🦀 Rust:</strong> Formats Rust syntax with proper structure</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>Examples by Language:</h3>
              
              <div className="language-example">
                <h4>🔵 Go Example:</h4>
                <div className="example-box">
                  <div className="example-col">
                    <strong>Input:</strong>
                    <code>{`package main;import "fmt";func main(){fmt.Println("Hello")}`}</code>
                  </div>
                  <div className="example-col">
                    <strong>Formatted:</strong>
                    <code>{`package main

import "fmt"

func main() {
\tfmt.Println("Hello")
}`}</code>
                  </div>
                </div>
              </div>

              <div className="language-example">
                <h4>☕ Java Example:</h4>
                <div className="example-box">
                  <div className="example-col">
                    <strong>Input:</strong>
                    <code>{`public class Main{public static void main(String[]args){System.out.println("Hello");}}`}</code>
                  </div>
                  <div className="example-col">
                    <strong>Formatted:</strong>
                    <code>{`public class Main {
  public static void main(String[] args) {
    System.out.println("Hello");
  }
}`}</code>
                  </div>
                </div>
              </div>

              <div className="language-example">
                <h4>⚛️ React/JSX Example:</h4>
                <div className="example-box">
                  <div className="example-col">
                    <strong>Input:</strong>
                    <code>{`function App(){return(<div><h1>Hello</h1></div>)}`}</code>
                  </div>
                  <div className="example-col">
                    <strong>Formatted:</strong>
                    <code>{`function App() {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  )
}`}</code>
                  </div>
                </div>
              </div>

              <div className="language-example">
                <h4>🐍 Python Example:</h4>
                <div className="example-box">
                  <div className="example-col">
                    <strong>Input:</strong>
                    <code>{`def greet():print("Hello");if True:print("World")`}</code>
                  </div>
                  <div className="example-col">
                    <strong>Formatted:</strong>
                    <code>{`def greet():
  print("Hello")
  if True:
    print("World")`}</code>
                  </div>
                </div>
              </div>

              <div className="language-example">
                <h4>🦀 Rust Example:</h4>
                <div className="example-box">
                  <div className="example-col">
                    <strong>Input:</strong>
                    <code>{`fn main(){println!("Hello");let x=5;}`}</code>
                  </div>
                  <div className="example-col">
                    <strong>Formatted:</strong>
                    <code>{`fn main() {
  println!("Hello");
  let x = 5;
}`}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'base64-image' && (
          <div className="guide-content">
            <h2>📚 How to Use Base64 to Image Converter</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Convert Base64 encoded strings to viewable images. Decode and preview images embedded in data URIs or Base64 strings.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste your Base64 string into the input panel</li>
                <li>Supports both raw Base64 and data URI formats</li>
                <li>Image preview appears automatically in the output panel</li>
                <li>Download the decoded image to your computer</li>
                <li>Works with PNG, JPEG, GIF, and other image formats</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Supported formats:</h3>
              <code>data:image/png;base64,iVBORw0KGgoAAAA...</code><br/>
              <code>iVBORw0KGgoAAAANSUhEUgAAA...</code>
            </div>
          </div>
        )}

        {activeTool === 'uuid-generator' && (
          <div className="guide-content">
            <h2>📚 How to Use UUID Generator</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Generate universally unique identifiers (UUIDs) in bulk. Supports both Version 1 (timestamp-based) and Version 4 (random) UUIDs.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Select UUID version (V1 for timestamp-based, V4 for random)</li>
                <li>Choose how many UUIDs to generate (1-100)</li>
                <li>Click "Generate" button to create UUIDs</li>
                <li>Copy individual UUIDs or all at once</li>
                <li>Use for database keys, unique identifiers, session IDs</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>UUID Versions:</h3>
              <ul>
                <li><strong>Version 1:</strong> Timestamp-based, includes MAC address and timestamp</li>
                <li><strong>Version 4:</strong> Randomly generated, most commonly used</li>
              </ul>
              <div className="example-box">
                <strong>Example UUIDs:</strong><br/>
                <code>V4: 550e8400-e29b-41d4-a716-446655440000</code><br/>
                <code>V1: 6ba7b810-9dad-11d1-80b4-00c04fd430c8</code>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'jwt-tool' && (
          <div className="guide-content">
            <h2>📚 How to Use JWT Tool</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Decode and inspect JSON Web Tokens (JWT). View header, payload, and signature components. Perfect for debugging authentication tokens.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Switch to "Decode" mode</li>
                <li>Paste your JWT token into the input panel</li>
                <li>View decoded header and payload in JSON format</li>
                <li>Inspect claims, expiration time, and issuer</li>
                <li>Copy decoded data for further analysis</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Input (JWT Token):</strong>
                  <code style={{ fontSize: '0.75em', wordBreak: 'break-all' }}>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ...</code>
                </div>
                <div className="example-col">
                  <strong>Decoded Payload:</strong>
                  <code>{`{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'timestamp-converter' && (
          <div className="guide-content">
            <h2>📚 How to Use Timestamp Converter</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Convert between Unix timestamps and human-readable dates. Supports both seconds and milliseconds timestamps. Bidirectional conversion.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li><strong>Timestamp → Date:</strong> Paste Unix timestamp (10 or 13 digits)</li>
                <li><strong>Date → Timestamp:</strong> Enter ISO date or use "Current Time"</li>
                <li>View conversion results with multiple formats</li>
                <li>See year, month, day, hours, minutes, seconds breakdown</li>
                <li>Copy results in your preferred format</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Timestamp to Date:</strong>
                  <code>Input: 1701388800</code><br/>
                  <code>Output: 2023-12-01 00:00:00 UTC</code>
                </div>
                <div className="example-col">
                  <strong>Date to Timestamp:</strong>
                  <code>Input: 2023-12-01T00:00:00Z</code><br/>
                  <code>Output: 1701388800</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'text-diff' && (
          <div className="guide-content">
            <h2>📚 How to Use Text Diff / Compare Tool</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Compare two text blocks line-by-line with visual highlighting. Different lines are highlighted directly in the editors - red for Text 1, green for Text 2.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Paste original text into the left panel (Text 1)</li>
                <li>Paste modified text into the right panel (Text 2)</li>
                <li>Different lines are automatically highlighted with colored backgrounds</li>
                <li>Red highlight with left border = Line is different in Text 1 (original)</li>
                <li>Green highlight with left border = Line is different in Text 2 (modified)</li>
                <li>No highlight = Lines are identical</li>
                <li>See comparison statistics at the bottom (match rate, identical/different lines)</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Visual Indicators:</h3>
              <ul>
                <li><strong>Red Background:</strong> Lines that differ in Text 1 (Original)</li>
                <li><strong>Green Background:</strong> Lines that differ in Text 2 (Modified)</li>
                <li><strong>Red Glyph Margin:</strong> Red bar in the gutter next to different lines in Text 1</li>
                <li><strong>Green Glyph Margin:</strong> Green bar in the gutter next to different lines in Text 2</li>
                <li><strong>No Highlight:</strong> Lines are identical in both texts</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>Example:</h3>
              <div className="example-box">
                <div className="example-col">
                  <strong>Text 1 (Original):</strong>
                  <code>{`Hello World
This is line 2
Common line 3`}</code>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Line 2 will have <span style={{ color: '#ef4444' }}>red background</span> highlighting
                  </p>
                </div>
                <div className="example-col">
                  <strong>Text 2 (Modified):</strong>
                  <code>{`Hello World
This is line 2 modified
Common line 3`}</code>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Line 2 will have <span style={{ color: '#22c55e' }}>green background</span> highlighting
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <strong>Result:</strong> 2 identical lines, 1 different line (66.7% match)
              </div>
            </div>
          </div>
        )}

        {activeTool === 'hash-generator' && (
          <div className="guide-content">
            <h2>📚 How to Use Hash Generator</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Generate cryptographic hash values from any text using popular algorithms: MD5, SHA-1, SHA-256, and SHA-512. Perfect for verifying file integrity, password hashing, and data validation.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Type or paste your text into the input panel</li>
                <li>Select a hash algorithm from the selector (MD5, SHA1, SHA256, SHA512)</li>
                <li>The hash is generated automatically as you type</li>
                <li>Copy the hash output using the Copy button</li>
                <li>Download the hash using the Download button</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Hash Algorithms:</h3>
              <ul>
                <li><strong>MD5:</strong> 128-bit hash (32 hex characters). Fast but not cryptographically secure. Good for checksums.</li>
                <li><strong>SHA-1:</strong> 160-bit hash (40 hex characters). Legacy algorithm, not recommended for security-critical applications.</li>
                <li><strong>SHA-256:</strong> 256-bit hash (64 hex characters). Part of SHA-2 family. Industry standard for secure hashing.</li>
                <li><strong>SHA-512:</strong> 512-bit hash (128 hex characters). More secure variant of SHA-2. Best for maximum security.</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>Examples:</h3>
              <div className="example-box">
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Input Text:</strong>
                  <code>Hello World</code>
                </div>
                <div className="example-col">
                  <strong>MD5:</strong>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>b10a8db164e0754105b7a99be72e3fe5</code>
                </div>
                <div className="example-col">
                  <strong>SHA-1:</strong>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>0a4d55a8d778e5022fab701977c5d840bbc486d0</code>
                </div>
                <div className="example-col">
                  <strong>SHA-256:</strong>
                  <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e</code>
                </div>
                <div className="example-col">
                  <strong>SHA-512:</strong>
                  <code style={{ fontSize: '0.65rem', wordBreak: 'break-all' }}>2c74fd17edafd80e8447b0d46741ee243b7eb74dd2149a0ab1b9246fb30382f27e853d8585719e0e67cbda0daa8f51671064615d645ae27acb15bfb1447f459b</code>
                </div>
              </div>
            </div>
            <div className="guide-section">
              <h3>Common Use Cases:</h3>
              <ul>
                <li>Verify file integrity and checksums</li>
                <li>Generate unique identifiers from data</li>
                <li>Password hashing (use SHA-256 or SHA-512)</li>
                <li>Digital signatures and certificates</li>
                <li>Data deduplication and caching keys</li>
              </ul>
            </div>
          </div>
        )}

        {activeTool === 'encoding-tool' && (
          <div className="guide-content">
            <h2>📚 How to Use Encoding/Decoding Tool</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Encode and decode text using various encoding formats: Base64, Base32, Base58, Hexadecimal, HTML entities, and URL encoding. Perfect for data transmission, storage, and web development.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Select <strong>Encode</strong> or <strong>Decode</strong> mode using the toggle buttons</li>
                <li>Choose encoding format: Base64, Base32, Base58, Hex, HTML, or URL</li>
                <li>Type or paste your text in the input panel</li>
                <li>Result appears automatically in the output panel</li>
                <li>Click Copy to copy the result, or Download to save it</li>
                <li>Use Load Sample to see examples for each format</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Encoding Formats:</h3>
              <ul>
                <li><strong>Base64:</strong> Standard encoding for binary data in text format. Used in email attachments, data URIs, JWT tokens.</li>
                <li><strong>Base32:</strong> Case-insensitive encoding using 32 characters (A-Z, 2-7). Good for human-readable codes.</li>
                <li><strong>Base58:</strong> Bitcoin/cryptocurrency encoding. Removes confusing characters (0, O, I, l) for better readability.</li>
                <li><strong>Hex (Base16):</strong> Hexadecimal encoding (0-9, a-f). Common in color codes, binary data representation.</li>
                <li><strong>HTML:</strong> Escape HTML special characters (&lt;, &gt;, &amp;, quotes) to prevent XSS attacks and display HTML as text.</li>
                <li><strong>URL:</strong> Encode special characters for safe URL transmission. Converts spaces to %20, etc.</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>Examples:</h3>
              <div className="example-box">
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                  <strong>📝 Text Encoding Examples:</strong>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    <code>Original: Hello World! 🌍</code>
                  </div>
                </div>
                <div className="example-col">
                  <strong>Base64 Encoded:</strong>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginTop: '0.5rem' }}>SGVsbG8gV29ybGQhIPCfjI0=</code>
                </div>
                <div className="example-col">
                  <strong>Base32 Encoded:</strong>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginTop: '0.5rem' }}>JBSWY3DPEBLW64TMMQQQ====</code>
                </div>
                <div className="example-col">
                  <strong>Hex Encoded:</strong>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginTop: '0.5rem' }}>48656c6c6f20576f726c6421</code>
                </div>
                <div className="example-col">
                  <strong>Base58 Encoded:</strong>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginTop: '0.5rem' }}>2NEpo7TZRRrLZSi2U</code>
                </div>
              </div>
              
              <div className="example-box" style={{ marginTop: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                  <strong>🌐 HTML Encoding Example:</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Converts HTML special characters to entities to display HTML code as text
                  </p>
                </div>
                <div className="example-col">
                  <strong>Original HTML:</strong>
                  <code style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>&lt;div class="box"&gt;Tom &amp; Jerry's "Show"&lt;/div&gt;</code>
                </div>
                <div className="example-col">
                  <strong>HTML Encoded:</strong>
                  <code style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.5rem', wordBreak: 'break-all' }}>&amp;lt;div class=&amp;quot;box&amp;quot;&amp;gt;Tom &amp;amp; Jerry&amp;#39;s &amp;quot;Show&amp;quot;&amp;lt;/div&amp;gt;</code>
                </div>
              </div>

              <div className="example-box" style={{ marginTop: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                  <strong>🔗 URL Encoding Example:</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Encodes special characters for safe URL transmission
                  </p>
                </div>
                <div className="example-col">
                  <strong>Original URL:</strong>
                  <code style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.5rem', wordBreak: 'break-all' }}>https://example.com/search?q=hello world&name=Tom & Jerry</code>
                </div>
                <div className="example-col">
                  <strong>URL Encoded:</strong>
                  <code style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.5rem', wordBreak: 'break-all' }}>https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26name%3DTom%20%26%20Jerry</code>
                </div>
              </div>
            </div>
            <div className="guide-section">
              <h3>Common Use Cases:</h3>
              <ul>
                <li><strong>Base64:</strong> Embedding images in CSS/HTML, email attachments, API data transfer</li>
                <li><strong>Base32:</strong> Two-factor authentication (2FA) codes, case-insensitive identifiers</li>
                <li><strong>Base58:</strong> Bitcoin addresses, short URLs, cryptocurrency wallets</li>
                <li><strong>Hex:</strong> Color codes (#FF5733), MAC addresses, binary file inspection</li>
                <li><strong>HTML:</strong> Display code snippets, prevent XSS attacks, escape user input</li>
                <li><strong>URL:</strong> Query parameters, form data submission, sharing links with special characters</li>
              </ul>
            </div>
          </div>
        )}

        {activeTool === 'case-converter' && (
          <div className="guide-content">
            <h2>📚 How to Use Case Converter</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Convert text to different case formats instantly. All 7 case transformations are displayed simultaneously in a grid layout for easy comparison and copying.</p>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <ol>
                <li>Type or paste your text in the input panel</li>
                <li>All case transformations appear automatically in the output grid</li>
                <li>Click the copy icon on any case box to copy that specific format</li>
                <li>Use Load Sample to see example transformations</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Case Types:</h3>
              <ul>
                <li><strong>lowercase:</strong> All letters in lowercase. Example: <code>hello world example</code></li>
                <li><strong>UPPERCASE:</strong> All letters in uppercase. Example: <code>HELLO WORLD EXAMPLE</code></li>
                <li><strong>camelCase:</strong> First word lowercase, rest capitalized with no spaces. Example: <code>helloWorldExample</code></li>
                <li><strong>PascalCase:</strong> All words capitalized with no spaces. Example: <code>HelloWorldExample</code></li>
                <li><strong>snake_case:</strong> Words separated by underscores, all lowercase. Example: <code>hello_world_example</code></li>
                <li><strong>kebab-case:</strong> Words separated by hyphens, all lowercase. Example: <code>hello-world-example</code></li>
                <li><strong>CONSTANT_CASE:</strong> Words separated by underscores, all uppercase. Example: <code>HELLO_WORLD_EXAMPLE</code></li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>Examples:</h3>
              <div className="example-box">
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                  <strong>Input:</strong> <code>"Hello World Example Text"</code>
                </div>
                <div className="example-col">
                  <strong>lowercase:</strong>
                  <code>hello world example text</code>
                </div>
                <div className="example-col">
                  <strong>UPPERCASE:</strong>
                  <code>HELLO WORLD EXAMPLE TEXT</code>
                </div>
                <div className="example-col">
                  <strong>camelCase:</strong>
                  <code>helloWorldExampleText</code>
                </div>
                <div className="example-col">
                  <strong>PascalCase:</strong>
                  <code>HelloWorldExampleText</code>
                </div>
                <div className="example-col">
                  <strong>snake_case:</strong>
                  <code>hello_world_example_text</code>
                </div>
                <div className="example-col">
                  <strong>kebab-case:</strong>
                  <code>hello-world-example-text</code>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>CONSTANT_CASE:</strong>
                  <code>HELLO_WORLD_EXAMPLE_TEXT</code>
                </div>
              </div>
            </div>
            <div className="guide-section">
              <h3>Common Use Cases:</h3>
              <ul>
                <li><strong>camelCase:</strong> JavaScript/Java variable names, object properties</li>
                <li><strong>PascalCase:</strong> Class names, React component names, C# properties</li>
                <li><strong>snake_case:</strong> Python variables, database column names, file names</li>
                <li><strong>kebab-case:</strong> CSS classes, URLs, HTML attributes, file names</li>
                <li><strong>CONSTANT_CASE:</strong> Environment variables, constants in code</li>
                <li><strong>UPPERCASE/lowercase:</strong> Text formatting, SQL keywords, general text processing</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>💡 Pro Tips:</h3>
              <ul>
                <li>The converter intelligently splits words from various input formats (spaces, underscores, hyphens, camelCase)</li>
                <li>Input "user_profile_data" or "UserProfileData" or "user-profile-data" - all produce the same results</li>
                <li>Perfect for converting between different programming language conventions</li>
                <li>Each case box has its own copy button for quick clipboard access</li>
              </ul>
            </div>
          </div>
        )}

        {activeTool === 'rsa-encryption' && (
          <div className="guide-content">
            <h2>🔐 How to Use RSA Encryption</h2>
            <div className="guide-section">
              <h3>What it does:</h3>
              <p>Complete RSA (Rivest-Shamir-Adleman) encryption toolkit with key generation, encryption/decryption, and digital signature capabilities. RSA is an asymmetric cryptography algorithm using public/private key pairs.</p>
            </div>
            <div className="guide-section">
              <h3>5 Main Functions:</h3>
              <ul>
                <li><strong>🔑 Key Generator:</strong> Generate RSA key pairs (1024, 2048, or 4096 bits)</li>
                <li><strong>🔒 Encryption:</strong> Encrypt messages with public key (only private key can decrypt)</li>
                <li><strong>🔓 Decryption:</strong> Decrypt encrypted messages with private key</li>
                <li><strong>✍️ Sign Message:</strong> Create digital signature with private key</li>
                <li><strong>✅ Verify Signature:</strong> Verify message authenticity with public key</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>How to use:</h3>
              <h4>1️⃣ Generate Keys:</h4>
              <ol>
                <li>Select "Key Generator" mode</li>
                <li>Choose key size (2048 bits recommended)</li>
                <li>Click "Generate RSA Key Pair" button</li>
                <li>Save both keys securely - Public key for encryption, Private key for decryption</li>
              </ol>
              
              <h4>2️⃣ Encrypt Message:</h4>
              <ol>
                <li>Select "Encryption" mode</li>
                <li>Paste recipient's public key</li>
                <li>Enter your message</li>
                <li>Encrypted text appears automatically (Base64 format)</li>
              </ol>
              
              <h4>3️⃣ Decrypt Message:</h4>
              <ol>
                <li>Select "Decryption" mode</li>
                <li>Paste your private key</li>
                <li>Enter encrypted text (Base64)</li>
                <li>Original message appears in output</li>
              </ol>
              
              <h4>4️⃣ Sign Message:</h4>
              <ol>
                <li>Select "Sign Message" mode</li>
                <li>Paste your private key</li>
                <li>Enter message to sign</li>
                <li>Digital signature appears in output (Base64)</li>
              </ol>
              
              <h4>5️⃣ Verify Signature:</h4>
              <ol>
                <li>Select "Verify Signature" mode</li>
                <li>Paste sender's public key</li>
                <li>Enter the signature (Base64)</li>
                <li>Enter original message</li>
                <li>Verification result shows if signature is valid</li>
              </ol>
            </div>
            <div className="guide-section">
              <h3>Key Sizes:</h3>
              <ul>
                <li><strong>1024 bits:</strong> Fast but less secure (not recommended for sensitive data)</li>
                <li><strong>2048 bits (Recommended):</strong> Good balance of security and performance</li>
                <li><strong>4096 bits:</strong> Maximum security but slower (may take longer to generate)</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>⚠️ Security Best Practices:</h3>
              <ul>
                <li><strong>Private Key Protection:</strong> NEVER share your private key. It's like your password!</li>
                <li><strong>Public Key Distribution:</strong> Public key can be shared freely - use it for encryption and signature verification</li>
                <li><strong>Key Storage:</strong> Store private keys in secure, encrypted storage</li>
                <li><strong>Key Size:</strong> Use minimum 2048 bits for production systems</li>
                <li><strong>Browser-Only:</strong> This tool runs entirely in your browser - keys are not sent to any server</li>
                <li><strong>Backup Keys:</strong> Save generated keys immediately. Lost private key = lost access to encrypted data</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>💡 Common Use Cases:</h3>
              <ul>
                <li><strong>Encryption:</strong> Secure message exchange, protect sensitive data</li>
                <li><strong>Decryption:</strong> Access your encrypted messages and files</li>
                <li><strong>Digital Signatures:</strong> Prove message authenticity and integrity</li>
                <li><strong>Verification:</strong> Validate that messages haven't been tampered with</li>
                <li><strong>Key Exchange:</strong> Securely exchange encryption keys with others</li>
                <li><strong>Learning:</strong> Understand asymmetric cryptography concepts</li>
              </ul>
            </div>
            <div className="guide-section">
              <h3>📚 Understanding RSA:</h3>
              <ul>
                <li><strong>Asymmetric Encryption:</strong> Uses two different keys (public & private) unlike symmetric encryption (AES)</li>
                <li><strong>Public Key:</strong> Can encrypt messages, verify signatures - safe to share publicly</li>
                <li><strong>Private Key:</strong> Can decrypt messages, create signatures - must be kept secret</li>
                <li><strong>Digital Signature:</strong> Proves the sender's identity and message integrity</li>
                <li><strong>Hash Function:</strong> Uses SHA-256 for signing and verification</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className={`error-banner ${jsonAutoFixed ? 'warning' : ''}`}>
          <XCircle size={20} />
          <div>
            <strong>{jsonAutoFixed ? 'Auto-fixed JSON:' : 'JSON Parse Error:'}</strong>
            <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
            {jsonAutoFixed && (
              <details style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                <summary style={{ cursor: 'pointer', color: '#fb015b' }}>
                  🔍 Xem before/after
                </summary>
                <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <strong style={{ color: '#ff6b6b' }}>❌ Before (lỗi):</strong>
                    <pre style={{ 
                      background: 'rgba(255,107,107,0.1)', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '150px',
                      fontSize: '0.85em'
                    }}>{originalJSON}</pre>
                  </div>
                  <div>
                    <strong style={{ color: '#51cf66' }}>✅ After (đã fix):</strong>
                    <pre style={{ 
                      background: 'rgba(81,207,102,0.1)', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '150px',
                      fontSize: '0.85em'
                    }}>{fixedJSON}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>Made with ❤️ for developers | Fast, Beautiful, Privacy-focused</p>
      </footer>
    </div>
  )
}

export default App
