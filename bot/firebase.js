/**
 * Firebase Database Module
 * Работа с базой данных Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

let db;

/**
 * Инициализация Firebase
 */
function initFirebase() {
    try {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                                   './firebase-service-account.json';

        const serviceAccount = require(path.resolve(serviceAccountPath));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        db = admin.firestore();
        console.log('✅ Firebase инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error.message);
        throw error;
    }
}

/**
 * Сохранить запись
 * @param {Object} booking - Данные записи
 * @returns {Promise<string>} - ID записи
 */
async function saveBooking(booking) {
    try {
        const bookingRef = await db.collection('bookings').add({
            ...booking,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Запись создана: ${bookingRef.id}`);
        return bookingRef.id;
    } catch (error) {
        console.error('❌ Ошибка сохранения записи:', error);
        throw error;
    }
}

/**
 * Получить записи пользователя
 * @param {string} userId - Telegram ID пользователя
 * @returns {Promise<Array>} - Массив записей
 */
async function getBookings(userId) {
    try {
        const snapshot = await db.collection('bookings')
            .where('userId', '==', userId)
            .get();

        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Сортируем по дате (новые первыми)
        bookings.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateB - dateA;
        });

        return bookings;
    } catch (error) {
        console.error('❌ Ошибка получения записей:', error);
        throw error;
    }
}

/**
 * Получить все записи (для админа)
 * @param {Object} filters - Фильтры (опционально)
 * @returns {Promise<Array>} - Массив записей
 */
async function getAllBookings(filters = {}) {
    try {
        let query = db.collection('bookings');

        // Применяем фильтры
        if (filters.date) {
            query = query.where('date', '==', filters.date);
        }
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        const snapshot = await query.get();

        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return bookings;
    } catch (error) {
        console.error('❌ Ошибка получения всех записей:', error);
        throw error;
    }
}

/**
 * Получить запись по ID
 * @param {string} bookingId - ID записи
 * @returns {Promise<Object>} - Данные записи
 */
async function getBookingById(bookingId) {
    try {
        const doc = await db.collection('bookings').doc(bookingId).get();

        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('❌ Ошибка получения записи по ID:', error);
        throw error;
    }
}

/**
 * Обновить запись
 * @param {string} bookingId - ID записи
 * @param {Object} updates - Данные для обновления
 * @returns {Promise<void>}
 */
async function updateBooking(bookingId, updates) {
    try {
        await db.collection('bookings').doc(bookingId).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Запись обновлена: ${bookingId}`);
    } catch (error) {
        console.error('❌ Ошибка обновления записи:', error);
        throw error;
    }
}

/**
 * Отменить запись
 * @param {string} bookingId - ID записи
 * @returns {Promise<void>}
 */
async function cancelBooking(bookingId) {
    try {
        await db.collection('bookings').doc(bookingId).update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Запись отменена: ${bookingId}`);
    } catch (error) {
        console.error('❌ Ошибка отмены записи:', error);
        throw error;
    }
}

/**
 * Удалить запись (полностью)
 * @param {string} bookingId - ID записи
 * @returns {Promise<void>}
 */
async function deleteBooking(bookingId) {
    try {
        await db.collection('bookings').doc(bookingId).delete();
        console.log(`✅ Запись удалена: ${bookingId}`);
    } catch (error) {
        console.error('❌ Ошибка удаления записи:', error);
        throw error;
    }
}

/**
 * Сохранить настройки
 * @param {Object} settings - Настройки
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
    try {
        await db.collection('settings').doc('main').set({
            ...settings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ Настройки сохранены');
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек:', error);
        throw error;
    }
}

/**
 * Получить настройки
 * @returns {Promise<Object>} - Настройки
 */
async function getSettings() {
    try {
        const doc = await db.collection('settings').doc('main').get();

        if (!doc.exists) {
            return {};
        }

        return doc.data();
    } catch (error) {
        console.error('❌ Ошибка получения настроек:', error);
        throw error;
    }
}

module.exports = {
    initFirebase,
    saveBooking,
    getBookings,
    getAllBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    deleteBooking,
    saveSettings,
    getSettings
};
