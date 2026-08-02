// Configuración Global
const TARGET_DATE = new Date('August 29, 2026 15:00:00').getTime();
const WHATSAPP_PHONE = "524427389456"; // Número para confirmación oficial de la tía

// Configuración de Firebase de la Web App
const firebaseConfig = {
  apiKey: "AIzaSyCcO1ENtpqb5xwEpe7m4AlQgJJahrXVrzM",
  authDomain: "invitacion-xv-32415.firebaseapp.com",
  databaseURL: "https://invitacion-xv-32415-default-rtdb.firebaseio.com",
  projectId: "invitacion-xv-32415",
  storageBucket: "invitacion-xv-32415.firebasestorage.app",
  messagingSenderId: "1083290435039",
  appId: "1:1083290435039:web:2177b586837aa637f6586a",
  measurementId: "G-W3NR68PZVG"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initEnvelope();
    initCountdown();
    initGuestCounter();
    initRsvpForm();
    initCalendarButtons();
    initScrollReveal();
    initAdminPanel();
    initSparkles();
    checkAccess(); // Control de acceso y visualización de pases
});

// --- LÓGICA DE LA APLICACIÓN ---

// 1. Apertura del Sobre Virtual (Envelope Intro)
function initEnvelope() {
    const waxSeal = document.getElementById('wax-seal');
    const envelopeWrapper = document.getElementById('envelope-wrapper');
    const mainContent = document.getElementById('main-content');

    if (!waxSeal || !envelopeWrapper) return;

    waxSeal.addEventListener('click', () => {
        playClickSound();

        envelopeWrapper.classList.add('opened-flaps');
        
        setTimeout(() => {
            envelopeWrapper.classList.add('opened');
            mainContent.classList.remove('blurred');
        }, 1200);
    });
}

function playClickSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(250, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.log("AudioContext no iniciado:", e);
    }
}

// 2. Cuenta Regresiva (Countdown)
function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    function updateCountdown() {
        const now = new Date().getTime();
        const difference = TARGET_DATE - now;

        if (difference < 0) {
            daysEl.innerText = "00";
            hoursEl.innerText = "00";
            minutesEl.innerText = "00";
            secondsEl.innerText = "00";
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        daysEl.innerText = days < 10 ? '0' + days : days;
        hoursEl.innerText = hours < 10 ? '0' + hours : hours;
        minutesEl.innerText = minutes < 10 ? '0' + minutes : minutes;
        secondsEl.innerText = seconds < 10 ? '0' + seconds : seconds;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// 3. Contador de Invitados (Soporte DOM de Nombre)
function initGuestCounter() {
    const guestNameInput = document.getElementById('guest-name');
    const ticketNameEl = document.getElementById('ticket-guest-name');
    const ticketCountEl = document.getElementById('ticket-guest-count');
    
    if (guestNameInput && ticketNameEl) {
        guestNameInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            ticketNameEl.innerText = val ? val : "Invitado Principal";
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const nameParam = urlParams.get('name');
    if (guestNameInput && nameParam) {
        const decodedName = decodeURIComponent(nameParam.replace(/\+/g, ' '));
        guestNameInput.value = decodedName;
        if (ticketNameEl) ticketNameEl.innerText = decodedName;
    }
}

// 4. Formulario de RSVP (Integrado con Firebase Realtime Database)
function initRsvpForm() {
    const form = document.getElementById('rsvp-form');
    const successMsg = document.getElementById('rsvp-success-msg');
    const btnReset = document.getElementById('btn-reset-form');
    const btnDownload = document.getElementById('btn-download-pass');
    const ticketStamp = document.getElementById('ticket-wax-seal-stamp');
    const liveTicket = document.getElementById('rsvp-live-ticket');
    const ticketCodeEl = document.getElementById('ticket-guest-code');
    const ticketCountEl = document.getElementById('ticket-guest-count');
    const placeholder = document.getElementById('final-ticket-placeholder');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('guest-name').value.trim();
        const phone = document.getElementById('guest-phone').value.trim();
        const attendanceRadio = document.querySelector('input[name="attendance"]:checked');
        const attendanceVal = attendanceRadio ? attendanceRadio.value : 'si';

        if (!name || !phone) return;

        // Deshabilitar botón para prevenir múltiples envíos
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }

        // Generar código único y ID de timestamp
        const uniqueCode = 'XV-' + Math.floor(1000 + Math.random() * 9000);
        const newId = Date.now();

        // Actualizar UI del boleto en vivo
        if (ticketCodeEl) ticketCodeEl.innerText = uniqueCode;
        if (ticketCountEl) ticketCountEl.innerText = "Pendiente";

        const guestObj = {
            id: newId,
            name: name,
            attendance: attendanceVal,
            count: 0,
            code: uniqueCode,
            phone: phone,
            status: 'pendiente'
        };

        // 1. Guardar en Firebase Realtime Database
        db.ref('guests/' + newId).set(guestObj)
            .then(() => {
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }

                // Configurar pantalla de éxito en modo "Espera"
                document.getElementById('success-status-title').innerText = "¡Registro en Proceso!";
                document.getElementById('success-status-desc').innerText = "Tu solicitud ha sido enviada. Tu pase digital te llegará por WhatsApp en cuanto la organizadora asigne tus pases.";
                
                const actionButtonsBlock = document.getElementById('success-action-buttons');
                if (actionButtonsBlock) {
                    actionButtonsBlock.classList.add('hidden');
                }

                // WhatsApp para la tía (solicitando pases)
                const attendanceText = attendanceVal === 'si' ? 'Sí, deseo asistir' : 'Lo sentimos, no podré asistir';
                const hostMessage = `¡Hola! Me he registrado en la invitación web para los *XV Años de Ximena Blanco Castillo* 🌸\n\n` +
                                    `👤 *Nombre/Familia:* ${name}\n` +
                                    `📞 *WhatsApp:* ${phone}\n` +
                                    `💌 *Asistencia:* ${attendanceText}\n\n` +
                                    `Quedo en espera de que asignes mis pases para recibir mi pase digital. ¡Muchas gracias! ✨`;

                const encodedHostMessage = encodeURIComponent(hostMessage);
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedHostMessage}`;

                // Mover el boleto al placeholder de éxito
                if (placeholder && liveTicket) {
                    placeholder.appendChild(liveTicket);
                }
                
                // Ocultar formulario, mostrar éxito
                document.querySelector('.rsvp-grid-container').classList.add('hidden');
                successMsg.classList.remove('hidden');

                // Redireccionar de inmediato a WhatsApp
                window.location.href = whatsappUrl;
            })
            .catch((error) => {
                console.error("Error al registrar en Firebase:", error);
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
                alert("Hubo un error de conexión al procesar tu confirmación. Intenta de nuevo.");
            });
    });

    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            // Deshabilitar botón para evitar clics dobles y mostrar indicador de carga
            btnDownload.disabled = true;
            const originalContent = btnDownload.innerHTML;
            btnDownload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';

            // Pausa/delay de 500ms antes de capturar el elemento para permitir que todo renderice
            setTimeout(() => {
                const originalElement = document.getElementById('rsvp-live-ticket');
                if (!originalElement) {
                    btnDownload.disabled = false;
                    btnDownload.innerHTML = originalContent;
                    return;
                }

                // Clonar el elemento de forma segura para evitar problemas de padres ocultos (display: none)
                const element = originalElement.cloneNode(true);
                
                // Forzar visibilidad y colocar fuera de pantalla en el body
                element.style.display = 'block';
                element.style.visibility = 'visible';
                element.style.position = 'absolute';
                element.style.left = '-9999px';
                element.style.top = '0';
                element.style.boxShadow = 'none';

                // Asegurar que el clon sea hijo directo de body para que html2canvas lo mida con sus dimensiones reales
                document.body.appendChild(element);

                const nameEl = document.getElementById('ticket-guest-name');
                const name = nameEl ? nameEl.innerText.trim() : 'Pase_Digital';
                
                const opt = {
                    margin:       [0.2, 0.2, 0.2, 0.2],
                    filename:     `Pase_XV_Ximena_${name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        scrollX: 0,
                        scrollY: 0
                    },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                // Ejecutar la generación y descarga desde el clon garantizado visible
                html2pdf().set(opt).from(element).save()
                    .then(() => {
                        // Limpiar el clon del DOM
                        document.body.removeChild(element);
                        btnDownload.disabled = false;
                        btnDownload.innerHTML = originalContent;
                    })
                    .catch((err) => {
                        console.error("Error al generar PDF con html2pdf, usando impresión nativa:", err);
                        // Limpiar el clon del DOM en caso de fallo
                        if (document.body.contains(element)) {
                            document.body.removeChild(element);
                        }
                        btnDownload.disabled = false;
                        btnDownload.innerHTML = originalContent;
                        // Fallback de respaldo nativo
                        window.print();
                    });
            }, 500);
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            const ticketContainer = document.querySelector('.ticket-preview-container');
            if (ticketContainer && liveTicket) {
                ticketContainer.appendChild(liveTicket);
            }

            if (ticketStamp) ticketStamp.classList.add('hidden');

            form.reset();
            document.getElementById('guest-name').value = '';
            document.getElementById('guest-phone').value = '';
            document.getElementById('ticket-guest-name').innerText = "Invitado Principal";
            if (ticketCodeEl) ticketCodeEl.innerText = "XV-PENDIENTE";
            if (ticketCountEl) ticketCountEl.innerText = "Pendiente";

            successMsg.classList.add('hidden');
            document.querySelector('.rsvp-grid-container').classList.remove('hidden');
        });
    }
}

// 5. Botones de Calendario
function initCalendarButtons() {
    const calButtons = document.querySelectorAll('.btn-add-calendar');
    
    calButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const eventType = btn.getAttribute('data-event');
            let url = '';

            if (eventType === 'misa') {
                const title = encodeURIComponent("Misa de Acción de Gracias - XV Años Ximena");
                const details = encodeURIComponent("Acompáñanos a dar gracias en la ceremonia religiosa por los XV años de Ximena Blanco Castillo.");
                const location = encodeURIComponent("Parroquia Jesucristo sumo y eterno sacerdote, Playa Roqueta, Av. Pie de la Cuesta 101, Desarrollo San Pablo, Santiago de Querétaro, Qro.");
                url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260829T210000Z/20260829T223000Z&details=${details}&location=${location}`;
            } else if (eventType === 'recepcion') {
                const title = encodeURIComponent("Recepción y Fiesta - XV Años Ximena");
                const details = encodeURIComponent("Banquete, vals y gran baile para celebrar los XV años de Ximena Blanco Castillo.");
                const location = encodeURIComponent("Salón del Río, Av. Universidad 187 Pte, Centro, Santiago de Querétaro, Qro.");
                url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260829T233000Z/20260830T080000Z&details=${details}&location=${location}`;
            }

            if (url) window.open(url, '_blank');
        });
    });
}

// 6. Scroll Reveal
function initScrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.12
    });

    reveals.forEach(el => observer.observe(el));
}

// 7. Panel de Administración (Integrado en tiempo real con Firebase)
function initAdminPanel() {
    const adminToggle = document.getElementById('admin-toggle-btn');
    const adminDrawer = document.getElementById('admin-drawer');
    const adminClose = document.getElementById('admin-close-btn');
    const btnClear = document.getElementById('btn-clear-guests');
    const btnToggleAdd = document.getElementById('btn-toggle-add-guest');
    const addGuestForm = document.getElementById('admin-add-guest-form');

    if (adminToggle) {
        adminToggle.addEventListener('click', () => {
            adminDrawer.classList.remove('hidden');
            syncAndLoadGuests(); // Escuchar en tiempo real a Firebase
        });
    }

    if (adminClose) {
        adminClose.addEventListener('click', () => {
            adminDrawer.classList.add('hidden');
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas borrar toda la lista de invitados de Firebase?')) {
                db.ref('guests').set(null)
                    .then(() => {
                        console.log("Todos los invitados borrados.");
                    })
                    .catch((err) => {
                        console.error("Error al borrar de Firebase:", err);
                    });
            }
        });
    }

    // Toggle para desplegar registro manual
    if (btnToggleAdd && addGuestForm) {
        btnToggleAdd.addEventListener('click', () => {
            addGuestForm.classList.toggle('hidden');
        });
    }

    // Guardar registro manual directamente en Firebase
    if (addGuestForm) {
        addGuestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('admin-new-name').value.trim();
            const phone = document.getElementById('admin-new-phone').value.trim();

            if (!name || !phone) return;

            const uniqueCode = 'XV-' + Math.floor(1000 + Math.random() * 9000);
            const newId = Date.now();

            const newGuestObj = {
                id: newId,
                name: name,
                attendance: 'si',
                count: 2, // Pases por defecto
                code: uniqueCode,
                phone: phone,
                status: 'pendiente'
            };

            db.ref('guests/' + newId).set(newGuestObj)
                .then(() => {
                    addGuestForm.reset();
                    addGuestForm.classList.add('hidden');
                })
                .catch((error) => {
                    console.error("Error al registrar en Firebase:", error);
                    alert("Error de conexión al agregar el registro.");
                });
        });
    }
}

// Sincronizar y escuchar cambios de Firebase en Tiempo Real
function syncAndLoadGuests() {
    const loadingEl = document.getElementById('admin-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    // Escuchar el nodo /guests en tiempo real
    db.ref('guests').on('value', (snapshot) => {
        const data = snapshot.val();
        const guests = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                guests.push(data[key]);
            });
        }

        // Ordenar por ID descendente (los más recientes primero)
        guests.sort((a, b) => b.id - a.id);

        // Guardar copia local de respaldo
        localStorage.setItem('guests_rsvp', JSON.stringify(guests));

        if (loadingEl) loadingEl.classList.add('hidden');
        renderGuestList();
    }, (error) => {
        console.error("Error en lectura de Firebase:", error);
        if (loadingEl) loadingEl.classList.add('hidden');
        renderGuestList(); // Cargar caché de respaldo
    });
}

// Renderizar la tabla de invitados
function renderGuestList() {
    const guests = JSON.parse(localStorage.getItem('guests_rsvp')) || [];
    const tableBody = document.getElementById('guest-list-body');
    const totalGuestsEl = document.getElementById('total-confirmed-guests');
    const totalFamiliesEl = document.getElementById('total-confirmed-families');

    if (!tableBody) return;
    tableBody.innerHTML = '';

    let totalConfirmedPases = 0;
    let totalFamilies = 0;

    guests.forEach(guest => {
        const row = document.createElement('tr');
        const isAttending = guest.attendance === 'si';
        
        let attendanceBadge = '';
        if (guest.status === 'pendiente') {
            attendanceBadge = '<span style="color:#f57c00; font-weight:600;"><i class="fas fa-clock"></i> Pendiente</span>';
        } else {
            attendanceBadge = isAttending 
                ? '<span style="color:#2e7d32; font-weight:600;"><i class="fas fa-check"></i> Asistirá</span>'
                : '<span style="color:#c62828; font-weight:600;"><i class="fas fa-times"></i> Cancelado</span>';
        }

        if (isAttending && guest.status === 'aprobado') {
            totalConfirmedPases += guest.count;
            totalFamilies++;
        }

        let pasesCol = '';
        let actionCol = '';

        if (guest.status === 'pendiente') {
            pasesCol = `<input type="number" min="1" max="10" value="2" class="admin-pases-input" id="pases-input-${guest.id}" style="width: 55px; padding: 4px 6px; border: 1px solid var(--primary-dark); border-radius: 6px; text-align: center;">`;
            actionCol = `
                <button class="btn btn-primary btn-sm btn-approve-row" data-id="${guest.id}" style="padding: 6px 12px; font-size: 0.7rem; border-radius: 30px; margin-bottom: 5px;">
                    <i class="fas fa-check"></i> Enviar Pase
                </button>
                <button class="btn-delete-row" data-id="${guest.id}" aria-label="Eliminar" style="margin-left: 10px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        } else {
            pasesCol = `<strong style="font-size: 1rem; color: var(--primary-dark);">${guest.count}</strong>`;
            actionCol = `
                <button class="btn btn-sm btn-resend-row" data-id="${guest.id}" style="padding: 6px 12px; font-size: 0.7rem; border-radius: 30px; background: #25d366; color: white; margin-bottom: 5px;">
                    <i class="fab fa-whatsapp"></i> Reenviar
                </button>
                <button class="btn-delete-row" data-id="${guest.id}" aria-label="Eliminar" style="margin-left: 10px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        }

        row.innerHTML = `
            <td><strong>${escapeHTML(guest.name)}</strong><br><small style="color:#8c7373; font-size:0.75rem;">${guest.code || 'Sin código'}</small></td>
            <td><a href="https://wa.me/52${guest.phone}" target="_blank" style="color:var(--primary-dark); text-decoration:none;"><i class="fab fa-whatsapp"></i> ${escapeHTML(guest.phone || 'Sin tel')}</a></td>
            <td>${attendanceBadge}</td>
            <td>${pasesCol}</td>
            <td style="white-space: nowrap;">${actionCol}</td>
        `;
        tableBody.appendChild(row);
    });

    if (totalGuestsEl) totalGuestsEl.innerText = totalConfirmedPases;
    if (totalFamiliesEl) totalFamiliesEl.innerText = totalFamilies;

    // Conectar eventos
    tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const guestId = parseInt(btn.getAttribute('data-id'));
            if (confirm('¿Estás seguro de que deseas eliminar este registro de Firebase?')) {
                deleteGuestLocal(guestId);
            }
        });
    });

    tableBody.querySelectorAll('.btn-approve-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const guestId = parseInt(btn.getAttribute('data-id'));
            approveAndSendGuest(guestId);
        });
    });

    tableBody.querySelectorAll('.btn-resend-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const guestId = parseInt(btn.getAttribute('data-id'));
            resendGuestPass(guestId);
        });
    });
}

// Acción de aprobación en Firebase
function approveAndSendGuest(id) {
    const pasesInput = document.getElementById(`pases-input-${id}`);
    const pasesCount = pasesInput ? parseInt(pasesInput.value) : 2;

    // Actualizar datos del invitado en Firebase Realtime Database
    db.ref('guests/' + id).update({
        status: 'aprobado',
        count: pasesCount
    })
    .then(() => {
        // Cargar el registro desde el caché actualizado de Firebase
        const guests = JSON.parse(localStorage.getItem('guests_rsvp')) || [];
        const guest = guests.find(g => g.id === id);
        if (guest) {
            sendPassViaWhatsApp(guest, pasesCount);
        }
    })
    .catch((error) => {
        console.error("Error al actualizar pase en Firebase:", error);
        alert("Error de conexión al aprobar el pase.");
    });
}

function resendGuestPass(id) {
    const guests = JSON.parse(localStorage.getItem('guests_rsvp')) || [];
    const guest = guests.find(g => g.id === id);
    if (!guest) return;

    sendPassViaWhatsApp(guest, guest.count);
}

// Enviar boleto abriendo chat de WhatsApp
function sendPassViaWhatsApp(guest, pasesCount) {
    const baseUrl = window.location.href.split('?')[0];
    const guestLink = `${baseUrl}?acceso=ximena&viewpass=true&name=${encodeURIComponent(guest.name)}&pases=${pasesCount}&code=${guest.code}&phone=${guest.phone}`;

    const message = `🎫 *TU PASE DE ACCESO DIGITAL OFICIAL - XV DE XIMENA BLANCO* 🌸\n\n` +
                    `¡Hola! Tu registro de asistencia ha sido aprobado y tus pases de acceso han sido asignados.\n\n` +
                    `👤 *Familia/Invitado:* ${guest.name}\n` +
                    `👥 *Pases Asignados:* *${pasesCount}* ${pasesCount === 1 ? 'pase' : 'pases'}\n` +
                    `🔑 *Código de Pase:* *${guest.code}*\n\n` +
                    `Puedes abrir, escanear y descargar tu boleto digital con código QR haciendo clic en el siguiente enlace:\n` +
                    `👉 ${guestLink}\n\n` +
                    `¡Te esperamos con mucha emoción para compartir este día mágico! ✨`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=52${guest.phone}&text=${encodedMessage}`;

    window.location.href = whatsappUrl;
}

// Eliminar de Firebase
function deleteGuestLocal(id) {
    db.ref('guests/' + id).remove()
        .then(() => {
            console.log("Eliminado de Firebase");
        })
        .catch((error) => {
            console.error("Error al borrar de Firebase:", error);
            alert("No se pudo eliminar el registro. Intenta de nuevo.");
        });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// 8. Sistema de Control de Acceso y Renderizador de Pase Directo
function checkAccess() {
    const lockScreen = document.getElementById('lock-screen');
    const envelopeWrapper = document.getElementById('envelope-wrapper');
    const mainContent = document.getElementById('main-content');
    
    if (!lockScreen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const accesoParam = urlParams.get('acceso');
    const viewpassParam = urlParams.get('viewpass');

    // MODO BYPASS: SI ES UN INVITADO CON TICKET APROBADO ENVIADO POR LA TÍA
    if (accesoParam === 'ximena' && viewpassParam === 'true') {
        const name = urlParams.get('name');
        const pases = parseInt(urlParams.get('pases')) || 0;
        const code = urlParams.get('code');
        const phone = urlParams.get('phone') || '';

        // Desbloquear instantáneamente sin sobre ni contraseña
        if (lockScreen) lockScreen.style.display = 'none';
        if (envelopeWrapper) envelopeWrapper.style.display = 'none';
        if (mainContent) mainContent.classList.remove('blurred');

        // Configurar boleto en pantalla directamente
        const ticketNameEl = document.getElementById('ticket-guest-name');
        const ticketCountEl = document.getElementById('ticket-guest-count');
        const ticketCodeEl = document.getElementById('ticket-guest-code');
        const ticketStamp = document.getElementById('ticket-wax-seal-stamp');
        const liveTicket = document.getElementById('rsvp-live-ticket');
        const placeholder = document.getElementById('final-ticket-placeholder');
        const successMsg = document.getElementById('rsvp-success-msg');
        
        if (ticketNameEl) ticketNameEl.innerText = name;
        if (ticketCodeEl) ticketCodeEl.innerText = code;
        if (ticketCountEl) ticketCountEl.innerText = `${pases} ${pases === 1 ? 'Pase' : 'Pases'}`;

        // Generar QR para el boleto aprobado
        const qrDataText = `Pase XV Ximena Blanco Castillo\nInvitado: ${name}\nPases: ${pases}\nCodigo: ${code}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrDataText)}`;
        
        const qrImg = document.getElementById('qr-code-img');
        if (qrImg) qrImg.src = qrUrl;

        // Estampar el sello digital de cera de inmediato
        if (ticketStamp) ticketStamp.classList.remove('hidden');

        // Configurar la interfaz de éxito en modo "Confirmado"
        document.getElementById('success-status-title').innerText = "¡Pase Confirmado!";
        document.getElementById('success-status-desc').innerText = "Tu pase digital está listo. Puedes guardarlo como PDF para presentarlo en la entrada o enviártelo a tu propio WhatsApp.";

        // Mostrar botones de PDF y WhatsApp
        const actionButtonsBlock = document.getElementById('success-action-buttons');
        if (actionButtonsBlock) {
            actionButtonsBlock.classList.remove('hidden');
        }

        // Configurar auto-envío de WhatsApp
        const btnSendSelf = document.getElementById('btn-send-self-whatsapp');
        if (btnSendSelf && phone) {
            const selfMessage = `🎫 *MI PASE DIGITAL - XV DE XIMENA BLANCO* 🌸\n\n` +
                                `👤 *Familia:* ${name}\n` +
                                `🔑 *Código de Acceso:* *${code}*\n` +
                                `👥 *Pases:* ${pases}\n` +
                                `⛪ *Misa:* 3:00 PM (Parroquia Jesucristo Sumo y Eterno Sacerdote)\n` +
                                `🎈 *Recepción:* 5:30 PM (Salón del Río)\n\n` +
                                `Puedes volver a abrir tu pase digital en cualquier momento en el siguiente link:\n` +
                                `👉 ${window.location.href}`;
            btnSendSelf.href = `https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(selfMessage)}`;
        }

        // Mover el boleto al placeholder de éxito
        if (placeholder && liveTicket) {
            placeholder.appendChild(liveTicket);
        }

        // Ocultar formulario de RSVP y mostrar la tarjeta de éxito directamente
        const rsvpGrid = document.querySelector('.rsvp-grid-container');
        if (rsvpGrid) rsvpGrid.classList.add('hidden');
        if (successMsg) successMsg.classList.remove('hidden');

        // Ocultar el botón de "Registrar otra respuesta" para evitar confusión al invitado
        const btnReset = document.getElementById('btn-reset-form');
        if (btnReset) btnReset.classList.add('hidden');

        return;
    }

    // DESBLOQUEO AUTOMÁTICO CON ENLACE GENERAL
    if (accesoParam === 'ximena') {
        unlockPage();
        return;
    }

    // DESBLOQUEO AUTOMÁTICO DE ADMINISTRADOR
    if (accesoParam === 'admin') {
        unlockPage();
        const adminBtn = document.getElementById('admin-toggle-btn');
        if (adminBtn) adminBtn.classList.remove('hidden');
        
        const adminDrawer = document.getElementById('admin-drawer');
        if (adminDrawer) {
            setTimeout(() => {
                adminDrawer.classList.remove('hidden');
                syncAndLoadGuests(); // Escuchar Firebase en tiempo real
            }, 1000);
        }
        return;
    }

    // Si no tiene llave de acceso, mostrar pantalla de bloqueo
    lockScreen.classList.remove('hidden');

    const btnUnlock = document.getElementById('btn-unlock');
    const passwordInput = document.getElementById('lock-password');
    const errorMsg = document.getElementById('lock-error-msg');

    function attemptUnlock() {
        const enteredPass = passwordInput.value.trim();
        if (enteredPass === '2908' || enteredPass.toLowerCase() === 'ximena') {
            unlockPage();
        } else {
            errorMsg.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    function unlockPage() {
        lockScreen.classList.add('unlocked');
        setTimeout(() => {
            lockScreen.style.display = 'none';
        }, 600);
    }

    if (btnUnlock) btnUnlock.addEventListener('click', attemptUnlock);
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                attemptUnlock();
            }
        });
    }
}

// 9. Efecto de Destellos en Hero (Canvas Sparkles)
function initSparkles() {
    const canvas = document.getElementById('sparkles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    const particles = [];
    const maxParticles = 60;
    
    window.addEventListener('resize', () => {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
    });
    
    class Sparkle {
        constructor() {
            this.reset();
            this.y = Math.random() * height;
        }
        
        reset() {
            this.x = Math.random() * width;
            this.y = -10;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = Math.random() * 0.7 + 0.25;
            this.speedX = Math.random() * 0.4 - 0.2;
            this.opacity = Math.random() * 0.6 + 0.2;
            this.fadeSpeed = Math.random() * 0.004 + 0.0015;
            this.color = Math.random() > 0.5 ? '#fbcbc9' : '#d4af37';
        }
        
        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.opacity -= this.fadeSpeed;
            
            if (this.y > height || this.opacity <= 0) {
                this.reset();
            }
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            
            if (this.size > 1.5) {
                const cx = this.x;
                const cy = this.y;
                ctx.moveTo(cx, cy - this.size);
                ctx.lineTo(cx + this.size * 0.3, cy - this.size * 0.3);
                ctx.lineTo(cx + this.size, cy);
                ctx.lineTo(cx + this.size * 0.3, cy + this.size * 0.3);
                ctx.lineTo(cx, cy + this.size);
                ctx.lineTo(cx - this.size * 0.3, cy + this.size * 0.3);
                ctx.lineTo(cx - this.size, cy);
                ctx.lineTo(cx - this.size * 0.3, cy - this.size * 0.3);
            } else {
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            }
            
            ctx.fill();
            ctx.restore();
        }
    }
    
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Sparkle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    
    animate();
}
