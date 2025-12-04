import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js";

const db = firebase.firestore();
const functions = firebase.functions();

const today = new Date().toISOString().split('T')[0];
const stateRef = db.doc('queue/state');

// Elements dari index.html asli kamu
const takeQueueBtn = document.getElementById('takeQueueBtn');
const userTicketInfo = document.getElementById('userTicketInfo');
const userTicketNumber = document.getElementById('userTicketNumber');
const queueDisplay = document.getElementById('queueDisplay');
const waitingCount = document.getElementById('waitingCount');
const calledCount = document.getElementById('calledCount');
const missingCount = document.getElementById('missingCount');
const doneCount = document.getElementById('doneCount');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

function showNotification(msg, duration = 3000) {
    notificationText.textContent = msg;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', duration);
}

function computeStatus(ticket, current) {
    if (ticket.done) return 'done';
    if (ticket.number < current) return 'missed';
    if (ticket.number === current) return 'called';
    return 'waiting';
}

// Check user ticket dari localStorage
function checkUserTicket() {
    const ticketId = localStorage.getItem('userTicketId');
    if (!ticketId) return;

    db.collection('tickets').doc(ticketId).onSnapshot(doc => {
        if (doc.exists) {
            const ticket = doc.data();
            userTicketNumber.textContent = ticket.number;
            userTicketInfo.style.display = 'block';
            takeQueueBtn.style.display = 'none';
        }
    });
}

// Ambil nomor antrian
takeQueueBtn.addEventListener('click', async () => {
    takeQueueBtn.disabled = true;
    takeQueueBtn.textContent = 'Memproses...';

    try {
        const generateTicket = httpsCallable(functions, 'generateTicket');
        const result = await generateTicket();
        const { ticketId, number } = result.data;

        localStorage.setItem('userTicketId', ticketId);
        showNotification(`Nomor Antrian Anda: ${number}`);
        checkUserTicket();
    } catch (err) {
        showNotification('Gagal mengambil nomor');
    }

    takeQueueBtn.disabled = false;
    takeQueueBtn.textContent = 'Ambil Nomor Antrian';
});

// Realtime update dashboard
stateRef.onSnapshot(stateDoc => {
    const state = stateDoc.data() || { currentNumber: 0 };
    const current = state.currentNumber;

    db.collection('tickets').where('date', '==', today).onSnapshot(snap => {
        let waiting = 0, called = 0, missed = 0, done = 0;
        snap.forEach(doc => {
            const ticket = doc.data();
            const status = computeStatus(ticket, current);
            if (status === 'waiting') waiting++;
            if (status === 'called') called++;
            if (status === 'missed') missed++;
            if (status === 'done') done++;
        });

        waitingCount.textContent = waiting;
        calledCount.textContent = called;
        missingCount.textContent = missed;
        doneCount.textContent = done;
        queueDisplay.textContent = state.nextNumber ? state.nextNumber - 1 : 0;
    });
});

checkUserTicket();