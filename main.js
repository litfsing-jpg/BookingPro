// Main JavaScript file for BookingPro

// Initialize animations and interactions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    initializeCalendar();
    initializeStats();
    initializeSpecialistsSlider();
    initializeP5Background();
});

// Initialize scroll animations
function initializeAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.card-hover, section > div').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Animate hero text
    anime({
        targets: '.gradient-text',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutElastic(1, .8)',
        delay: 500
    });

    // Animate buttons
    anime({
        targets: 'button',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(100, {start: 1000}),
        easing: 'easeOutQuart'
    });
}

// Initialize calendar with realistic data
function initializeCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Sample booking data - realistic schedule for a specialist
    const bookings = {
        10: [{ time: '09:00', client: 'Иван Петров', type: 'consultation', status: 'busy' },
             { time: '11:00', client: 'Мария Смирнова', type: 'training', status: 'busy' }],
        12: [{ time: '14:00', client: 'Анна Иванова', type: 'consultation', status: 'busy' },
             { time: '16:00', client: 'Дмитрий Соколов', type: 'training', status: 'partial' }],
        15: [{ time: '10:00', client: 'Елена Волкова', type: 'consultation', status: 'busy' }],
        17: [{ time: '13:00', client: 'Алексей Новиков', type: 'training', status: 'busy' },
             { time: '15:00', client: 'Ольга Козлова', type: 'consultation', status: 'busy' }],
        19: [{ time: '09:30', client: 'Наталья Морозова', type: 'consultation', status: 'busy' }],
        22: [{ time: '11:30', client: 'Сергей Петров', type: 'training', status: 'partial' }],
        24: [{ time: '14:30', client: 'Татьяна Сидорова', type: 'consultation', status: 'busy' }],
        26: [{ time: '16:30', client: 'Виктор Белов', type: 'training', status: 'busy' }],
        28: [{ time: '10:30', client: 'Ирина Федорова', type: 'consultation', status: 'busy' }]
    };
    
    // Create calendar cells
    let calendarHTML = '';
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay - 1; i++) {
        calendarHTML += '<div class="calendar-cell border-r border-b border-gray-200 p-2"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayBookings = bookings[day] || [];
        const hasFullDay = dayBookings.some(b => b.status === 'busy');
        const hasPartial = dayBookings.some(b => b.status === 'partial');
        
        let cellClass = 'calendar-cell border-r border-b border-gray-200 p-2 cursor-pointer';
        if (hasFullDay && dayBookings.length >= 2) {
            cellClass += ' slot-busy';
        } else if (hasPartial || (hasFullDay && dayBookings.length === 1)) {
            cellClass += ' slot-partial';
        } else {
            cellClass += ' slot-free';
        }
        
        calendarHTML += `
            <div class="${cellClass}" onclick="showDayDetails(${day})">
                <div class="font-semibold text-sm mb-1">${day}</div>
                ${dayBookings.length > 0 ? `
                    <div class="space-y-1">
                        ${dayBookings.slice(0, 2).map(booking => `
                            <div class="text-xs p-1 rounded bg-white/70 truncate">
                                ${booking.time} ${booking.client}
                            </div>
                        `).join('')}
                        ${dayBookings.length > 2 ? `<div class="text-xs text-gray-500">+${dayBookings.length - 2} еще</div>` : ''}
                    </div>
                ` : '<div class="text-xs text-gray-400">Свободно</div>'}
            </div>
        `;
    }
    
    calendarGrid.innerHTML = calendarHTML;
    
    // Animate calendar cells
    anime({
        targets: '.calendar-cell',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 600,
        delay: anime.stagger(20),
        easing: 'easeOutQuart'
    });
}

// Initialize statistics with animated counters
function initializeStats() {
    const stats = {
        clients: 127,
        bookings: 89,
        revenue: 45600,
        time: 23
    };
    
    // Animate counters
    Object.keys(stats).forEach(key => {
        const element = document.getElementById(`stat-${key}`);
        if (element) {
            animateCounter(element, 0, stats[key], key);
        }
    });
}

// Animate counter function
function animateCounter(element, start, end, type) {
    const duration = 2000;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        
        switch(type) {
            case 'revenue':
                element.textContent = current.toLocaleString() + '₽';
                break;
            case 'time':
                element.textContent = current + 'ч';
                break;
            default:
                element.textContent = current;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Initialize specialists slider
function initializeSpecialistsSlider() {
    const splide = new Splide('#specialists-slider', {
        type: 'loop',
        perPage: 3,
        perMove: 1,
        gap: '2rem',
        autoplay: true,
        interval: 4000,
        pauseOnHover: true,
        breakpoints: {
            1024: {
                perPage: 2,
            },
            640: {
                perPage: 1,
            }
        }
    });
    
    splide.mount();
}

// Initialize P5.js background
function initializeP5Background() {
    new p5((p) => {
        let particles = [];
        const numParticles = 50;
        
        p.setup = function() {
            const canvas = p.createCanvas(p.windowWidth, 400);
            canvas.parent('p5-background');
            
            // Create particles
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: p.random(p.width),
                    y: p.random(p.height),
                    vx: p.random(-0.5, 0.5),
                    vy: p.random(-0.5, 0.5),
                    size: p.random(2, 6),
                    opacity: p.random(0.1, 0.3)
                });
            }
        };
        
        p.draw = function() {
            p.clear();
            
            // Update and draw particles
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Wrap around edges
                if (particle.x < 0) particle.x = p.width;
                if (particle.x > p.width) particle.x = 0;
                if (particle.y < 0) particle.y = p.height;
                if (particle.y > p.height) particle.y = 0;
                
                // Draw particle
                p.fill(20, 184, 166, particle.opacity * 255);
                p.noStroke();
                p.ellipse(particle.x, particle.y, particle.size);
            });
            
            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = p.dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
                    if (dist < 100) {
                        p.stroke(20, 184, 166, (1 - dist / 100) * 50);
                        p.strokeWeight(1);
                        p.line(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
                    }
                }
            }
        };
        
        p.windowResized = function() {
            p.resizeCanvas(p.windowWidth, 400);
        };
    });
}

// Show day details modal
function showDayDetails(day) {
    // Sample data for the selected day
    const bookings = {
        10: [
            { time: '09:00', client: 'Иван Петров', service: 'Персональная тренировка', duration: '60 мин', price: '2,500₽', phone: '+7 999 123-45-67' },
            { time: '11:00', client: 'Мария Смирнова', service: 'Консультация', duration: '45 мин', price: '1,800₽', phone: '+7 999 234-56-78' }
        ],
        12: [
            { time: '14:00', client: 'Анна Иванова', service: 'Персональная тренировка', duration: '90 мин', price: '3,500₽', phone: '+7 999 345-67-89' }
        ]
    }[day] || [];
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold">Записи на ${day} ноября</h3>
                <button onclick="document.body.removeChild(this.closest('.fixed'))" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            ${bookings.length > 0 ? `
                <div class="space-y-4">
                    ${bookings.map(booking => `
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div class="font-semibold">${booking.time} - ${booking.client}</div>
                                <div class="text-teal-600 font-semibold">${booking.price}</div>
                            </div>
                            <div class="text-sm text-gray-600 mb-2">
                                ${booking.service} • ${booking.duration}
                            </div>
                            <div class="text-sm text-gray-500">
                                Тел: ${booking.phone}
                            </div>
                            <div class="flex space-x-2 mt-3">
                                <button class="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700">
                                    Подтвердить
                                </button>
                                <button class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                                    Отменить
                                </button>
                                <button class="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400">
                                    Перенести
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-600">На этот день нет записей</p>
                    <button class="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
                        Добавить запись
                    </button>
                </div>
            `}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal appearance
    anime({
        targets: modal,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuart'
    });
    
    anime({
        targets: modal.querySelector('.bg-white'),
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 400,
        delay: 100,
        easing: 'easeOutQuart'
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add hover effects to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseenter', function() {
        anime({
            targets: this,
            scale: 1.05,
            duration: 200,
            easing: 'easeOutQuart'
        });
    });
    
    button.addEventListener('mouseleave', function() {
        anime({
            targets: this,
            scale: 1,
            duration: 200,
            easing: 'easeOutQuart'
        });
    });
});

// Burger menu functionality
function initializeBurgerMenu() {
    const burgerMenu = document.getElementById('burger-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (burgerMenu && mobileMenu) {
        burgerMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            
            // Animate menu appearance
            if (!mobileMenu.classList.contains('hidden')) {
                anime({
                    targets: mobileMenu,
                    opacity: [0, 1],
                    translateY: [-10, 0],
                    duration: 300,
                    easing: 'easeOutQuart'
                });
            }
        });
    }
}

// Form submission handler
function handleFormSubmission(formData) {
    // Show loading state
    const submitBtn = document.querySelector('#demo-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'bg-green-50 border border-green-200 rounded-lg p-4 mt-4';
        successMessage.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <div>
                    <div class="font-semibold text-green-800">Заявка отправлена!</div>
                    <div class="text-sm text-green-600">Мы отправим вам доступ на почту в течение 5 минут</div>
                </div>
            </div>
        `;
        
        const form = document.getElementById('demo-form');
        form.appendChild(successMessage);
        
        // Reset form
        form.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Remove success message after 5 seconds
        setTimeout(() => {
            if (form.contains(successMessage)) {
                form.removeChild(successMessage);
            }
        }, 5000);
        
        // Close modal after 2 seconds
        setTimeout(() => {
            const modal = document.getElementById('demo-modal');
            if (modal) {
                closeDemoModal();
            }
        }, 2000);
        
    }, 1500);
}

// Demo form modal
function showDemoForm() {
    const modal = document.createElement('div');
    modal.id = 'demo-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeDemoModal();
        }
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md w-full">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold">Доступ к демо</h3>
                <button onclick="closeDemoModal()" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <form id="demo-form" class="space-y-4" onsubmit="handleDemoFormSubmit(event)">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ваше имя</label>
                    <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Иван Иванов">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="ivan@example.com">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                    <input type="tel" name="phone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="+7 (999) 123-45-67">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ваша специализация</label>
                    <select name="specialization" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                        <option value="">Выберите специализацию</option>
                        <option value="fitness">Фитнес тренер</option>
                        <option value="yoga">Йога инструктор</option>
                        <option value="tutor">Репетитор</option>
                        <option value="consultant">Консультант</option>
                        <option value="massage">Массажист</option>
                        <option value="other">Другое</option>
                    </select>
                </div>
                
                <div class="flex items-center">
                    <input type="checkbox" id="agree" required class="mr-2">
                    <label for="agree" class="text-sm text-gray-600">Согласен с условиями использования</label>
                </div>
                
                <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold transition-colors">
                    Получить доступ
                </button>
            </form>
            
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Или <a href="demo.html" class="text-teal-600 hover:text-teal-700">посмотрите демо</a> без регистрации</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal appearance
    anime({
        targets: modal,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuart'
    });
    
    anime({
        targets: modal.querySelector('.bg-white'),
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 400,
        delay: 100,
        easing: 'easeOutQuart'
    });
}

function closeDemoModal() {
    const modal = document.getElementById('demo-modal');
    if (modal) {
        anime({
            targets: modal,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInQuart',
            complete: () => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }
        });
    }
}

function handleDemoFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    handleFormSubmission(formData);
}

// Add click handlers for demo buttons
document.addEventListener('click', function(e) {
    if (e.target.textContent.includes('Начать бесплатно')) {
        e.preventDefault();
        showDemoForm();
    }
});

// Initialize burger menu when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeBurgerMenu();
});