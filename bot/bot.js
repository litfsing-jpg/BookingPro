/**
 * BookingPro Telegram Bot
 * Бот для автоматизации записи клиентов
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { initFirebase, saveBooking, getBookings, cancelBooking } = require('./firebase');
const { createCalendarEvent, getAvailableSlots, deleteCalendarEvent } = require('./calendar');
const moment = require('moment-timezone');

// ========================================
// КОНФИГУРАЦИЯ
// ========================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Персональная тренировка';
const SERVICE_PRICE = process.env.SERVICE_PRICE || '2500';
const SERVICE_DURATION = parseInt(process.env.SERVICE_DURATION) || 60;

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Инициализация Firebase
initFirebase();

// Временное хранилище данных пользователей
const userSessions = {};

console.log('🤖 BookingPro Bot запущен!');
console.log(`📅 Часовой пояс: ${TIMEZONE}`);
console.log(`💼 Услуга: ${SERVICE_NAME} - ${SERVICE_PRICE}₽`);

// ========================================
// КОМАНДЫ БОТА
// ========================================

/**
 * /start - Приветствие
 */
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'друг';

    const welcomeMessage = `
👋 Привет, ${firstName}!

Добро пожаловать в *BookingPro* — твой персональный помощник для записи на тренировки!

📋 *Доступные команды:*

/book — Записаться на тренировку
/my_bookings — Мои записи
/cancel — Отменить запись
/help — Помощь

💪 *Наша услуга:*
${SERVICE_NAME}
⏱ Длительность: ${SERVICE_DURATION} минут
💰 Стоимость: ${SERVICE_PRICE}₽

Нажми /book чтобы записаться!
    `;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

/**
 * /help - Помощь
 */
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
ℹ️ *Как пользоваться ботом:*

1️⃣ *Записаться* — нажми /book
2️⃣ Выбери *дату* из предложенных
3️⃣ Выбери *время* из свободных слотов
4️⃣ Введи свое *имя*
5️⃣ Подтверди запись

После записи ты получишь подтверждение, и тебе придет напоминание за день до тренировки!

📋 *Другие команды:*
/my_bookings — посмотреть свои записи
/cancel — отменить запись

❓ *Есть вопросы?*
Напиши нам: @your_support_username
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

/**
 * /book - Начать процесс записи
 */
bot.onText(/\/book/, async (msg) => {
    const chatId = msg.chat.id;

    // Инициализируем сессию пользователя
    userSessions[chatId] = {
        step: 'choose_date',
        date: null,
        time: null,
        name: null
    };

    await sendDateSelection(chatId);
});

/**
 * Отправка выбора даты
 */
async function sendDateSelection(chatId) {
    const dates = getNext7Days();

    const keyboard = {
        inline_keyboard: dates.map(date => [{
            text: date.label,
            callback_data: `date_${date.value}`
        }])
    };

    await bot.sendMessage(
        chatId,
        '📅 *Выберите дату для записи:*',
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }
    );
}

/**
 * Получить следующие 7 дней
 */
function getNext7Days() {
    const dates = [];
    const today = moment().tz(TIMEZONE);

    for (let i = 0; i < 7; i++) {
        const date = today.clone().add(i, 'days');
        const label = i === 0 ? '🔥 Сегодня' :
                      i === 1 ? '📆 Завтра' :
                      date.format('DD MMMM (dddd)');

        dates.push({
            label: label,
            value: date.format('YYYY-MM-DD')
        });
    }

    return dates;
}

/**
 * Отправка выбора времени
 */
async function sendTimeSelection(chatId, selectedDate) {
    try {
        // Получаем свободные слоты из Google Calendar
        const availableSlots = await getAvailableSlots(selectedDate);

        if (availableSlots.length === 0) {
            await bot.sendMessage(
                chatId,
                '😔 К сожалению, на эту дату нет свободных слотов.\n\nПопробуйте выбрать другую дату: /book'
            );
            delete userSessions[chatId];
            return;
        }

        const keyboard = {
            inline_keyboard: availableSlots.map(slot => [{
                text: slot.label,
                callback_data: `time_${slot.value}`
            }])
        };

        keyboard.inline_keyboard.push([{
            text: '◀️ Назад',
            callback_data: 'back_to_date'
        }]);

        const dateLabel = moment(selectedDate).tz(TIMEZONE).format('DD MMMM YYYY (dddd)');

        await bot.sendMessage(
            chatId,
            `⏰ *Выберите время на ${dateLabel}:*\n\n✅ — свободные слоты`,
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );
    } catch (error) {
        console.error('Ошибка при получении слотов:', error);
        await bot.sendMessage(
            chatId,
            '❌ Произошла ошибка при загрузке свободных слотов. Попробуйте позже.'
        );
        delete userSessions[chatId];
    }
}

/**
 * Запрос имени клиента
 */
async function askForName(chatId) {
    await bot.sendMessage(
        chatId,
        '👤 *Как вас зовут?*\n\nНапишите ваше имя:',
        { parse_mode: 'Markdown' }
    );

    userSessions[chatId].step = 'enter_name';
}

/**
 * Подтверждение записи
 */
async function confirmBooking(chatId, name) {
    const session = userSessions[chatId];
    const dateTime = moment.tz(`${session.date} ${session.time}`, TIMEZONE);

    const message = `
✅ *Подтверждение записи*

👤 Имя: ${name}
📅 Дата: ${dateTime.format('DD MMMM YYYY (dddd)')}
⏰ Время: ${dateTime.format('HH:mm')}
💼 Услуга: ${SERVICE_NAME}
⏱ Длительность: ${SERVICE_DURATION} мин
💰 Стоимость: ${SERVICE_PRICE}₽

Всё верно?
    `;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Да, подтвердить', callback_data: 'confirm_yes' },
                { text: '❌ Отменить', callback_data: 'confirm_no' }
            ]
        ]
    };

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });

    session.step = 'confirm';
    session.name = name;
}

/**
 * Создание записи
 */
async function createBooking(chatId) {
    const session = userSessions[chatId];
    const userId = chatId.toString();
    const dateTime = moment.tz(`${session.date} ${session.time}`, TIMEZONE);

    try {
        // Создаем событие в Google Calendar
        const calendarEvent = await createCalendarEvent({
            summary: `${SERVICE_NAME} - ${session.name}`,
            description: `Клиент: ${session.name}\nTelegram ID: ${chatId}\nЦена: ${SERVICE_PRICE}₽`,
            startTime: dateTime.toISOString(),
            duration: SERVICE_DURATION
        });

        // Сохраняем запись в Firebase
        const booking = {
            userId,
            clientName: session.name,
            telegramUsername: userSessions[chatId].username || '',
            date: session.date,
            time: session.time,
            service: SERVICE_NAME,
            price: SERVICE_PRICE,
            duration: SERVICE_DURATION,
            status: 'confirmed',
            calendarEventId: calendarEvent.id,
            createdAt: new Date().toISOString()
        };

        const bookingId = await saveBooking(booking);

        // Уведомление клиенту
        const clientMessage = `
🎉 *Запись подтверждена!*

📋 Номер записи: #${bookingId.slice(-6)}

👤 Имя: ${session.name}
📅 Дата: ${dateTime.format('DD MMMM YYYY (dddd)')}
⏰ Время: ${dateTime.format('HH:mm')}
💼 Услуга: ${SERVICE_NAME}
💰 Стоимость: ${SERVICE_PRICE}₽

📍 Адрес будет отправлен вам за день до тренировки.

Увидимся! 💪

_Для отмены: /cancel_
        `;

        await bot.sendMessage(chatId, clientMessage, { parse_mode: 'Markdown' });

        // Уведомление админу
        const adminMessage = `
🔔 *Новая запись!*

👤 Клиент: ${session.name}
📱 Telegram: @${userSessions[chatId].username || 'не указан'}
🆔 ID: ${chatId}

📅 Дата: ${dateTime.format('DD MMMM YYYY (dddd)')}
⏰ Время: ${dateTime.format('HH:mm')}
💼 Услуга: ${SERVICE_NAME}
💰 Сумма: ${SERVICE_PRICE}₽

📋 ID записи: ${bookingId}
        `;

        await bot.sendMessage(ADMIN_ID, adminMessage, { parse_mode: 'Markdown' });

        // Очищаем сессию
        delete userSessions[chatId];

    } catch (error) {
        console.error('Ошибка при создании записи:', error);
        await bot.sendMessage(
            chatId,
            '❌ Произошла ошибка при создании записи. Попробуйте позже или свяжитесь с поддержкой.'
        );
        delete userSessions[chatId];
    }
}

/**
 * /my_bookings - Показать записи пользователя
 */
bot.onText(/\/my_bookings/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    try {
        const bookings = await getBookings(userId);

        if (bookings.length === 0) {
            await bot.sendMessage(
                chatId,
                '📋 У вас пока нет записей.\n\nЗаписаться: /book'
            );
            return;
        }

        const upcomingBookings = bookings.filter(b => {
            const bookingDate = moment.tz(`${b.date} ${b.time}`, TIMEZONE);
            return bookingDate.isAfter(moment()) && b.status === 'confirmed';
        });

        if (upcomingBookings.length === 0) {
            await bot.sendMessage(
                chatId,
                '📋 У вас нет предстоящих записей.\n\nЗаписаться: /book'
            );
            return;
        }

        let message = '📋 *Ваши записи:*\n\n';

        upcomingBookings.forEach((booking, index) => {
            const dateTime = moment.tz(`${booking.date} ${booking.time}`, TIMEZONE);
            message += `${index + 1}. 📅 ${dateTime.format('DD MMM')} ⏰ ${dateTime.format('HH:mm')}\n`;
            message += `   💼 ${booking.service}\n`;
            message += `   📋 ID: #${booking.id.slice(-6)}\n\n`;
        });

        message += '_Для отмены: /cancel_';

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Ошибка при получении записей:', error);
        await bot.sendMessage(
            chatId,
            '❌ Произошла ошибка при загрузке записей.'
        );
    }
});

/**
 * /cancel - Отменить запись
 */
bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    try {
        const bookings = await getBookings(userId);
        const upcomingBookings = bookings.filter(b => {
            const bookingDate = moment.tz(`${b.date} ${b.time}`, TIMEZONE);
            return bookingDate.isAfter(moment()) && b.status === 'confirmed';
        });

        if (upcomingBookings.length === 0) {
            await bot.sendMessage(
                chatId,
                '📋 У вас нет записей для отмены.'
            );
            return;
        }

        const keyboard = {
            inline_keyboard: upcomingBookings.map(booking => {
                const dateTime = moment.tz(`${booking.date} ${booking.time}`, TIMEZONE);
                return [{
                    text: `${dateTime.format('DD MMM HH:mm')} - ${booking.service}`,
                    callback_data: `cancel_${booking.id}`
                }];
            })
        };

        await bot.sendMessage(
            chatId,
            '❌ *Выберите запись для отмены:*',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

    } catch (error) {
        console.error('Ошибка при отмене записи:', error);
        await bot.sendMessage(
            chatId,
            '❌ Произошла ошибка при загрузке записей.'
        );
    }
});

// ========================================
// ОБРАБОТКА CALLBACK QUERIES
// ========================================

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Сохраняем username для уведомлений
    if (!userSessions[chatId]) {
        userSessions[chatId] = {};
    }
    userSessions[chatId].username = query.from.username;

    try {
        // Выбор даты
        if (data.startsWith('date_')) {
            const selectedDate = data.replace('date_', '');
            userSessions[chatId].date = selectedDate;
            userSessions[chatId].step = 'choose_time';

            await bot.answerCallbackQuery(query.id);
            await bot.deleteMessage(chatId, query.message.message_id);
            await sendTimeSelection(chatId, selectedDate);
        }

        // Выбор времени
        else if (data.startsWith('time_')) {
            const selectedTime = data.replace('time_', '');
            userSessions[chatId].time = selectedTime;

            await bot.answerCallbackQuery(query.id);
            await bot.deleteMessage(chatId, query.message.message_id);
            await askForName(chatId);
        }

        // Назад к выбору даты
        else if (data === 'back_to_date') {
            await bot.answerCallbackQuery(query.id);
            await bot.deleteMessage(chatId, query.message.message_id);
            await sendDateSelection(chatId);
        }

        // Подтверждение записи - Да
        else if (data === 'confirm_yes') {
            await bot.answerCallbackQuery(query.id, { text: 'Создаем запись...' });
            await bot.deleteMessage(chatId, query.message.message_id);
            await createBooking(chatId);
        }

        // Подтверждение записи - Нет
        else if (data === 'confirm_no') {
            await bot.answerCallbackQuery(query.id);
            await bot.deleteMessage(chatId, query.message.message_id);
            await bot.sendMessage(chatId, '❌ Запись отменена.\n\nДля новой записи: /book');
            delete userSessions[chatId];
        }

        // Отмена записи
        else if (data.startsWith('cancel_')) {
            const bookingId = data.replace('cancel_', '');

            // Получаем информацию о записи
            const bookings = await getBookings(chatId.toString());
            const booking = bookings.find(b => b.id === bookingId);

            if (!booking) {
                await bot.answerCallbackQuery(query.id, { text: 'Запись не найдена' });
                return;
            }

            // Удаляем из Google Calendar
            if (booking.calendarEventId) {
                await deleteCalendarEvent(booking.calendarEventId);
            }

            // Отменяем в Firebase
            await cancelBooking(bookingId);

            const dateTime = moment.tz(`${booking.date} ${booking.time}`, TIMEZONE);

            await bot.answerCallbackQuery(query.id, { text: 'Запись отменена' });
            await bot.deleteMessage(chatId, query.message.message_id);
            await bot.sendMessage(
                chatId,
                `✅ Запись отменена:\n\n📅 ${dateTime.format('DD MMMM')} ⏰ ${dateTime.format('HH:mm')}\n💼 ${booking.service}`
            );

            // Уведомление админу
            await bot.sendMessage(
                ADMIN_ID,
                `❌ *Отмена записи*\n\n👤 ${booking.clientName}\n📅 ${dateTime.format('DD MMMM HH:mm')}\n💼 ${booking.service}`,
                { parse_mode: 'Markdown' }
            );
        }

    } catch (error) {
        console.error('Ошибка при обработке callback:', error);
        await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
    }
});

// ========================================
// ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
// ========================================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Игнорируем команды
    if (text && text.startsWith('/')) return;

    // Проверяем сессию пользователя
    if (!userSessions[chatId]) return;

    const session = userSessions[chatId];

    // Ввод имени
    if (session.step === 'enter_name' && text) {
        const name = text.trim();

        if (name.length < 2) {
            await bot.sendMessage(chatId, 'Имя должно содержать минимум 2 символа. Попробуйте еще раз:');
            return;
        }

        await confirmBooking(chatId, name);
    }
});

// ========================================
// ОБРАБОТКА ОШИБОК
// ========================================

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

console.log('✅ Бот готов к работе!');
