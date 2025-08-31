import dotenv from 'dotenv';
import { saveCard, saveLog, getStorageStats, listCards } from './storage.js';

dotenv.config();

async function testStorage() {
  try {
    console.log('🧪 Testing Google Cloud Storage integration...');
    
    // Test 1: Save a test card
    console.log('\n1️⃣ Testing card save...');
    const testCard = {
      id: 'test-card-' + Date.now(),
      title: 'Test Dragon',
      series: 'Test Series',
      stats: { power: 85, speed: 70, magic: 90 },
      rarity: 'Legendary'
    };
    
    const cardPath = await saveCard(testCard.id, testCard);
    console.log(`✅ Test card saved to: ${cardPath}`);
    
    // Test 2: Save a test log
    console.log('\n2️⃣ Testing log save...');
    await saveLog('info', 'Storage test completed successfully', { 
      testId: testCard.id,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Test log saved');
    
    // Test 3: Get storage statistics
    console.log('\n3️⃣ Testing storage stats...');
    const stats = await getStorageStats();
    console.log('✅ Storage stats retrieved:', stats);
    
    // Test 4: List cards
    console.log('\n4️⃣ Testing card listing...');
    const cards = await listCards();
    console.log(`✅ Found ${cards.length} cards in storage`);
    if (cards.length > 0) {
      console.log('Most recent card:', cards[0].title);
    }
    
    console.log('\n🎉 All storage tests passed! Your setup is ready.');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testStorage();