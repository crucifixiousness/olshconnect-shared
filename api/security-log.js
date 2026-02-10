// api/security-log.js

const fs = require('fs').promises;
const path = require('path');

// GeoIP lookup function (you can integrate with MaxMind or similar service)
const getGeoIPInfo = async (ip) => {
  try {
    // For now, return basic info. You can integrate with MaxMind GeoIP2 or similar
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    return {
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      isp: data.isp || 'Unknown',
      region: data.regionName || 'Unknown'
    };
  } catch (error) {
    return {
      country: 'Unknown',
      city: 'Unknown',
      isp: 'Unknown',
      region: 'Unknown'
    };
  }
};

// Calculate bot score based on various factors
const calculateBotScore = (attackData) => {
  let score = 0;
  
  // Check for known bot user agents
  const botUserAgents = ['sqlmap', 'curl', 'wget', 'python', 'scanner', 'bot', 'crawler'];
  if (botUserAgents.some(bot => attackData.userAgent.toLowerCase().includes(bot))) {
    score += 30;
  }
  
  // Check for suspicious referrers
  if (attackData.referrer && attackData.referrer.includes('attacker.com')) {
    score += 25;
  }
  
  // Check for common attack patterns
  if (attackData.exploitPayload) {
    score += 20;
  }
  
  // Check for multiple rapid requests
  if (attackData.numberOfCommands > 5) {
    score += 15;
  }
  
  // Check for suspicious IP ranges
  if (attackData.geoIP && attackData.geoIP.country === 'China') {
    score += 10;
  }
  
  return Math.min(score, 100);
};

// Format log entry according to specified format
const formatLogEntry = (attackData) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  return `=== SECURITY ALERT ===
Visitor IP Address: ${attackData.ip}
Timestamp: ${timestamp}
Requested URL or Endpoint: ${attackData.url}
HTTP Method: ${attackData.method}
User-Agent: ${attackData.userAgent}
Referrer: ${attackData.referrer || '(none)'}
Login Attempted (Username / Password): ${attackData.loginAttempt || '(none)'}
Command Attempted (SSH / Telnet Honeypot): ${attackData.commandAttempt || '(none)'}
Exploit Payload or Input: ${attackData.exploitPayload || '(none)'}
Uploaded or Downloaded File Info: ${attackData.fileInfo || '(none)'}
GeoIP Location (Resolved from IP): Country: ${attackData.geoIP?.country || 'Unknown'}, City: ${attackData.geoIP?.city || 'Unknown'}, ISP: ${attackData.geoIP?.isp || 'Unknown'}
Port Accessed: ${attackData.port || '80'}
Protocol Used: ${attackData.protocol || 'HTTP'}
Session Duration: ${attackData.sessionDuration || 'Unknown'}
Number of Commands Issued: Commands: ${attackData.numberOfCommands || 1}
Detected Vulnerability Attempt: ${attackData.vulnerabilityType || 'Unknown'}
Bot Score / Risk Score: Bot Score: ${attackData.botScore}%, Risk: ${attackData.riskLevel}
Honeypot Path Accessed: ${attackData.honeypotPath || '(none)'}
Headers: ${JSON.stringify(attackData.headers, null, 2)}
=== END ALERT ===

`;
};

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const {
        ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        url = req.url,
        method = req.method,
        userAgent = req.headers['user-agent'],
        referrer = req.headers['referer'],
        loginAttempt,
        commandAttempt,
        exploitPayload,
        fileInfo,
        port,
        protocol,
        sessionDuration,
        numberOfCommands,
        vulnerabilityType,
        honeypotPath,
        headers = req.headers,
        timestamp = new Date().toISOString()
      } = req.body;

      // Get GeoIP information
      const geoIP = await getGeoIPInfo(ip);
      
      // Calculate bot score
      const botScore = calculateBotScore({
        userAgent,
        referrer,
        exploitPayload,
        numberOfCommands,
        geoIP
      });
      
      // Determine risk level
      const riskLevel = botScore > 80 ? 'High' : botScore > 50 ? 'Medium' : 'Low';
      
      // Prepare attack data
      const attackData = {
        ip,
        url,
        method,
        userAgent,
        referrer,
        loginAttempt,
        commandAttempt,
        exploitPayload,
        fileInfo,
        geoIP,
        port,
        protocol,
        sessionDuration,
        numberOfCommands,
        vulnerabilityType,
        honeypotPath,
        headers,
        botScore,
        riskLevel,
        timestamp
      };

      // Log to log3.txt file only
      const logEntry = formatLogEntry(attackData);
      const logPath = path.join(process.cwd(), 'log3.txt');
      
      try {
        await fs.appendFile(logPath, logEntry);
      } catch (fileError) {
        console.error('Error writing to log3.txt:', fileError);
        // Create file if it doesn't exist
        try {
          await fs.writeFile(logPath, logEntry);
        } catch (createError) {
          console.error('Error creating log3.txt:', createError);
        }
      }

      // Console alert for immediate visibility
      console.warn('🚨 SECURITY ALERT LOGGED TO log3.txt:', {
        ip,
        vulnerabilityType,
        botScore,
        riskLevel,
        timestamp
      });

      res.json({ 
        message: "Security alert logged to log3.txt successfully",
        logged: true,
        botScore,
        riskLevel
      });

    } catch (error) {
      console.error("Error logging security alert:", error);
      res.status(500).json({ 
        error: "Failed to log security alert",
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}; 