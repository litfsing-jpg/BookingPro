/**
 * Google Calendar Module
 * Работа с Google Calendar API
 */

const { google } = require('googleapis');
const path = require('path');
const moment = require('moment-timezone');

const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const WORK_START_HOUR = parseInt(process.env.WORK_START_HOUR) || 9;
const WORK_END_HOUR = parseInt(process.env.WORK_END_HOUR) || 18;
const SLOT_DURATION = parseInt(process.env.SLOT_DURATION) || 60;
const BUFFER_TIME = parseInt(process.env.BUFFER_TIME) || 0;

let calendar;

/**
 * Инициализация Google Calendar API
 */
function initCalendar() {
    try {
        const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH ||
                               './google-calendar-credentials.json';

        const credentials = require(path.resolve(credentialsPath));

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });

        calendar = google.calendar({ version: 'v3', auth });
        console.log('✅ Google Calendar API инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Google Calendar:', error.message);
        throw error;
    }
}

/**
 * Получить свободные слоты на дату
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {Promise<Array>} - Массив свободных слотов
 */
async function getAvailableSlots(date) {
    try {
        if (!calendar) {
            initCalendar();
        }

        const startOfDay = moment.tz(date, TIMEZONE).hour(WORK_START_HOUR).minute(0).second(0);
        const endOfDay = moment.tz(date, TIMEZONE).hour(WORK_END_HOUR).minute(0).second(0);

        // Получаем занятые слоты из Google Calendar
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const busySlots = response.data.items || [];

        // Генерируем все возможные слоты
        const allSlots = [];
        let currentTime = startOfDay.clone();

        while (currentTime.isBefore(endOfDay)) {
            allSlots.push({
                start: currentTime.clone(),
                end: currentTime.clone().add(SLOT_DURATION, 'minutes')
            });

            currentTime.add(SLOT_DURATION + BUFFER_TIME, 'minutes');
        }

        // Фильтруем занятые слоты
        const availableSlots = allSlots.filter(slot => {
            // Проверяем что слот не в прошлом
            if (slot.start.isBefore(moment())) {
                return false;
            }

            // Проверяем пересечение с занятыми слотами
            const isAvailable = !busySlots.some(busyEvent => {
                const busyStart = moment(busyEvent.start.dateTime || busyEvent.start.date);
                const busyEnd = moment(busyEvent.end.dateTime || busyEvent.end.date);

                return slot.start.isBefore(busyEnd) && slot.end.isAfter(busyStart);
            });

            return isAvailable;
        });

        // Форматируем для отправки в бот
        return availableSlots.map(slot => ({
            label: slot.start.format('HH:mm'),
            value: slot.start.format('HH:mm')
        }));

    } catch (error) {
        console.error('❌ Ошибка получения свободных слотов:', error);
        throw error;
    }
}

/**
 * Создать событие в календаре
 * @param {Object} eventData - Данные события
 * @returns {Promise<Object>} - Созданное событие
 */
async function createCalendarEvent(eventData) {
    try {
        if (!calendar) {
            initCalendar();
        }

        const { summary, description, startTime, duration } = eventData;

        const start = moment(startTime);
        const end = start.clone().add(duration, 'minutes');

        const event = {
            summary,
            description,
            start: {
                dateTime: start.toISOString(),
                timeZone: TIMEZONE,
            },
            end: {
                dateTime: end.toISOString(),
                timeZone: TIMEZONE,
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },  // За день
                    { method: 'popup', minutes: 60 },        // За час
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });

        console.log(`✅ Событие создано в календаре: ${response.data.id}`);
        return response.data;

    } catch (error) {
        console.error('❌ Ошибка создания события в календаре:', error);
        throw error;
    }
}

/**
 * Обновить событие в календаре
 * @param {string} eventId - ID события
 * @param {Object} updates - Обновления
 * @returns {Promise<Object>} - Обновленное событие
 */
async function updateCalendarEvent(eventId, updates) {
    try {
        if (!calendar) {
            initCalendar();
        }

        // Получаем текущее событие
        const currentEvent = await calendar.events.get({
            calendarId: CALENDAR_ID,
            eventId,
        });

        const event = currentEvent.data;

        // Применяем обновления
        if (updates.summary) event.summary = updates.summary;
        if (updates.description) event.description = updates.description;
        if (updates.startTime) {
            const start = moment(updates.startTime);
            const duration = updates.duration || SLOT_DURATION;
            const end = start.clone().add(duration, 'minutes');

            event.start = {
                dateTime: start.toISOString(),
                timeZone: TIMEZONE,
            };
            event.end = {
                dateTime: end.toISOString(),
                timeZone: TIMEZONE,
            };
        }

        const response = await calendar.events.update({
            calendarId: CALENDAR_ID,
            eventId,
            resource: event,
        });

        console.log(`✅ Событие обновлено: ${eventId}`);
        return response.data;

    } catch (error) {
        console.error('❌ Ошибка обновления события:', error);
        throw error;
    }
}

/**
 * Удалить событие из календаря
 * @param {string} eventId - ID события
 * @returns {Promise<void>}
 */
async function deleteCalendarEvent(eventId) {
    try {
        if (!calendar) {
            initCalendar();
        }

        await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId,
        });

        console.log(`✅ Событие удалено из календаря: ${eventId}`);

    } catch (error) {
        console.error('❌ Ошибка удаления события:', error);
        throw error;
    }
}

/**
 * Получить событие по ID
 * @param {string} eventId - ID события
 * @returns {Promise<Object>} - Данные события
 */
async function getCalendarEvent(eventId) {
    try {
        if (!calendar) {
            initCalendar();
        }

        const response = await calendar.events.get({
            calendarId: CALENDAR_ID,
            eventId,
        });

        return response.data;

    } catch (error) {
        console.error('❌ Ошибка получения события:', error);
        throw error;
    }
}

/**
 * Получить все события за период
 * @param {string} startDate - Начальная дата
 * @param {string} endDate - Конечная дата
 * @returns {Promise<Array>} - Массив событий
 */
async function getCalendarEvents(startDate, endDate) {
    try {
        if (!calendar) {
            initCalendar();
        }

        const timeMin = moment.tz(startDate, TIMEZONE).startOf('day').toISOString();
        const timeMax = moment.tz(endDate, TIMEZONE).endOf('day').toISOString();

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items || [];

    } catch (error) {
        console.error('❌ Ошибка получения событий:', error);
        throw error;
    }
}

module.exports = {
    initCalendar,
    getAvailableSlots,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvent,
    getCalendarEvents
};
