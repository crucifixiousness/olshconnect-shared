export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, activityType, ...details } = req.body;
    
    // Get client IP address
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    'Unknown';
    
    // Format timestamp for log file
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    
    // Create detailed log entry
    const logEntry = `
=== LOGIN HONEYPOT LOG ENTRY ===
Visitor IP Address: ${clientIP}

Timestamp: ${timestamp}

Requested URL or Endpoint: /api/fake-login

HTTP Method: ${req.method}

User-Agent: ${req.headers['user-agent'] || 'Unknown'}

Referrer: ${req.headers['referer'] || '(none)'}

Request Body / POST Data: ${JSON.stringify(req.body) || 'N/A'}

Login Attempted (Username / Password): ${username || 'N/A'}:${password || 'N/A'}

Command Attempted (SSH / Telnet Honeypot): ${details.commandAttempt || 'N/A'}

Exploit Payload or Input: ${details.exploitPayload || details.value || 'N/A'}

Uploaded or Downloaded File Info: Filename: ${details.fileName || 'N/A'}, Size: ${details.fileSize || 'N/A'} bytes, Type: ${details.fileType || 'N/A'}

GeoIP Location (Resolved from IP): ${details.geoLocation || 'Unknown'}

Port Accessed: ${details.port || '443'}

Protocol Used: ${details.protocol || 'HTTPS'}

Session Duration: Connected for ${details.sessionDuration || 'Unknown'} seconds

Number of Commands Issued: Commands: ${details.commandCount || '1'}

Detected Vulnerability Attempt: ${details.vulnerabilityType || activityType || 'Fake Login Attempt'}

Bot Score / Risk Score: Bot Score: ${details.botScore || '85%'}, Risk: ${details.riskLevel || 'High'}

Honeypot Path Accessed: ${details.honeypotPath || '/fake_login_form'}

Headers: Content-Type: ${req.headers['content-type'] || 'application/json'}, User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}...

Activity Type: ${activityType || 'fake_login_attempt'}
Action: ${details.action || 'N/A'}
Additional Data: ${JSON.stringify(details, null, 2)}

=== END LOG ENTRY ===
`;
    
    // For Vercel deployment - log to console (appears in Vercel logs)
    console.log('=== LOGIN HONEYPOT LOG ENTRY ===');
    console.log(logEntry);
    console.log('=== END LOG ENTRY ===');
    
    // Also log structured data for easier parsing
    console.log('🚨 LOGIN HONEYPOT ACTIVITY:', {
      timestamp,
      activityType: activityType || 'fake_login_attempt',
      clientIP,
      username,
      password,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      details
    });
    
    // Simulate processing delay for realism
    setTimeout(() => {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials. Please try again.',
        timestamp,
        activityType: activityType || 'fake_login_attempt',
        clientIP,
        environment: 'vercel'
      });
    }, 1000);
    
  } catch (error) {
    console.error('❌ Login honeypot error:', error);
    res.status(500).json({ 
      error: 'Failed to process fake login',
      details: error.message 
    });
  }
} 