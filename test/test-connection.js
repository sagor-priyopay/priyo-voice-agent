require('dotenv').config();
const WebSocket = require('ws');

async function testOpenAIConnection() {
    console.log('🧪 Testing OpenAI Realtime API connection...');
    
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        return false;
    }
    
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });
        
        const timeout = setTimeout(() => {
            console.error('❌ Connection timeout');
            ws.close();
            resolve(false);
        }, 10000);
        
        ws.on('open', () => {
            console.log('✅ Successfully connected to OpenAI Realtime API');
            clearTimeout(timeout);
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            console.error('❌ OpenAI connection error:', error.message);
            clearTimeout(timeout);
            resolve(false);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message type:', message.type);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
    });
}

async function testServerHealth() {
    console.log('🧪 Testing server health...');
    
    try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        
        if (response.ok && data.status === 'healthy') {
            console.log('✅ Server health check passed');
            return true;
        } else {
            console.error('❌ Server health check failed:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Server not reachable:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Running Voice Agent Tests...\n');
    
    const results = {
        openai: await testOpenAIConnection(),
        server: await testServerHealth()
    };
    
    console.log('\n📊 Test Results:');
    console.log('OpenAI Connection:', results.openai ? '✅ PASS' : '❌ FAIL');
    console.log('Server Health:', results.server ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result);
    console.log('\nOverall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { testOpenAIConnection, testServerHealth };
