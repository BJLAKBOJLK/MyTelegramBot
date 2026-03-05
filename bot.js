const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

console.log('🔍 Начинаю запуск бота...');
console.log('✅ dotenv загружен');
console.log('📏 Длина токена бота:', process.env.BOT_TOKEN?.length || '0');
console.log('📏 Длина ключа DeepSeek:', process.env.DEEPSEEK_API_KEY?.length || '0');

// Проверяем токены
if (!process.env.BOT_TOKEN) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не найден в .env!');
  process.exit(1);
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('⚠️  ПРЕДУПРЕЖДЕНИЕ: DEEPSEEK_API_KEY не найден. Бот будет работать без AI.');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
console.log('✅ Бот инициализирован');

// Простая команда для тестирования
bot.start((ctx) => {
  console.log(`👤 Пользователь ${ctx.from.id} начал диалог`);
  ctx.reply(
    '🤖 Привет! Я тестовый бот с DeepSeek.\n\n' +
    'Напиши мне что-нибудь, и я попробую ответить через нейросеть!'
  );
});

// Команда для теста без DeepSeek
bot.command('/test', (ctx) => {
  ctx.reply('✅ Тестовая команда работает! Бот отвечает.');
});

// Обработка текстовых сообщений - УПРОЩЕННАЯ ВЕРСИЯ
bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;
  const userId = ctx.from.id;
  
  console.log(`📨 Получено сообщение от ${userId}: "${userMessage.substring(0, 50)}..."`);
  
  // Если нет ключа DeepSeek - просто эхо
  if (!process.env.DEEPSEEK_API_KEY) {
    ctx.reply(`Эхо: ${userMessage}`);
    return;
  }
  
  // Показываем "печатает"
  await ctx.sendChatAction('typing');
  
  try {
    console.log('🔄 Отправляю запрос к DeepSeek API...');
    
    // ПРОСТОЙ запрос к DeepSeek
    const response = await axios({
      method: 'POST',
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1000,  // Меньше для быстрого ответа
        temperature: 0.7,
        stream: false
      },
      timeout: 30000  // Таймаут 10 секунд
    });
    
    console.log('✅ Ответ от DeepSeek получен');
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content;
      console.log(`📤 Отправляю ответ (${aiResponse.length} символов)`);
      await ctx.reply(aiResponse);
    } else {
      console.error('❌ Неожиданный формат ответа от DeepSeek:', response.data);
      await ctx.reply('⚠️ Получен неожиданный ответ от нейросети');
    }
    
  } catch (error) {
    console.error('💥 ОШИБКА при запросе к DeepSeek:', error.message);
    
    // Подробная диагностика ошибки
    if (error.response) {
      console.error('📊 Статус ошибки:', error.response.status);
      console.error('📊 Данные ошибки:', error.response.data);
    }
    
    let errorMessage = '❌ Ошибка при запросе к нейросети: ';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '⏱️ Таймаут запроса (10 сек). Попробуйте позже.';
    } else if (error.response?.status === 401) {
      errorMessage = '🔑 Ошибка авторизации API. Проверьте ключ DeepSeek.';
    } else if (error.response?.status === 429) {
      errorMessage = '🚫 Слишком много запросов. Подождите.';
    } else {
      errorMessage += error.message;
    }
    
    await ctx.reply(errorMessage);
    await ctx.reply('Пока я буду просто повторять ваши сообщения 😊');
    await ctx.reply(`Эхо: ${userMessage}`);
  }
});

// Обработка ошибок самого Telegraf
bot.catch((err, ctx) => {
  console.error('💥 Ошибка Telegraf:', err);
  console.error('💥 Контекст:', ctx?.updateType);
  
  if (ctx && ctx.reply) {
    ctx.reply('⚠️ Внутренняя ошибка бота. Разработчик уведомлен.');
  }
});

// Запуск бота с улучшенной обработкой ошибок
console.log('🚀 Пытаюсь запустить бота...');

bot.launch()
  .then(() => {
    console.log('🎉 БОТ УСПЕШНО ЗАПУЩЕН!');
    console.log('🤖 Работает и готов к сообщениям');
    console.log('🛑 Для остановки нажмите Ctrl+C');
  })
  .catch((error) => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАПУСКЕ БОТА:');
    console.error('Сообщение:', error.message);
    console.error('Стек:', error.stack);
    
    if (error.message.includes('ETELEGRAM')) {
      console.log('\n🔧 ВОЗМОЖНОЕ РЕШЕНИЕ:');
      console.log('1. Проверьте BOT_TOKEN в .env файле');
      console.log('2. Убедитесь, что токен правильный и не содержит пробелов');
      console.log('3. Попробуйте создать новый токен в @BotFather');
    }
  });

// Корректная обработка завершения
process.once('SIGINT', () => {
  console.log('\n🛑 Получен SIGINT, останавливаю бота...');
  bot.stop('SIGINT');
  console.log('👋 Бот остановлен. До свидания!');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Получен SIGTERM, останавливаю бота...');
  bot.stop('SIGTERM');
});