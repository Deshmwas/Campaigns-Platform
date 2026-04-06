const fs = require('fs');
const path = 'server/src/services/EmailEngine.js';
let content = fs.readFileSync(path, 'utf8');

// Update the main 'send' method to include a fallback
const sendFallbackRegex = /if \(senderConfig \|\| this\.isReady\) \{([\s\S]+?)const info = await activeTransporter\.sendMail\(mailOptions\);([\s\S]+?)\}/m;

const sendFallbackReplacement = `if (senderConfig || this.isReady) {
                let info;
                try {
                    info = await activeTransporter.sendMail(mailOptions);
                } catch (smtpError) {
                    // --- FALLBACK TO RESEND ON TIMEOUT ---
                    if (config.resendApiKey && (smtpError.code === 'ETIMEDOUT' || smtpError.message.includes('timeout'))) {
                        console.warn('⚠️ SMTP timed out, falling back to Resend API...');
                        const response = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': \`Bearer \${config.resendApiKey}\`,
                            },
                            body: JSON.stringify({
                                from: \`\${fromName} <\${fromEmail}>\`,
                                to: Array.isArray(to) ? to : [to],
                                subject,
                                html: trackedHtml,
                                text: text || this.htmlToText(html),
                            }),
                        });

                        const data = await response.json();
                        if (response.ok) {
                            console.log(\`📧 Email successfully sent via Resend fallback to \${to}\`);
                            this.rateLimiter.count++;
                            return { success: true, messageId: data.id, response: 'Sent via Resend fallback' };
                        }
                    }
                    throw smtpError;
                }
                this.rateLimiter.count++;
                if (closeAfter) activeTransporter.close();

                console.log(\`📧 Email sent to \${to} - Message ID: \${info.messageId}\`);

                return {
                    success: true,
                    messageId: info.messageId,
                    response: info.response,
                };
            }`;

if (sendFallbackRegex.test(content)) {
    content = content.replace(sendFallbackRegex, sendFallbackReplacement);
    fs.writeFileSync(path, content);
    console.log('✅ Successfully added Resend fallback to EmailEngine.js');
} else {
    console.error('❌ Could not find target for send fallback in EmailEngine.js');
    process.exit(1);
}
