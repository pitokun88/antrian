import { useEffect, useState } from 'react';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import '../../../customer/style.css';

export default function CustomerHome() {
    const [currentNumber, setCurrentNumber] = useState(0);
    const [stats, setStats] = useState({ waiting: 0, called: 0, missed: 0, done: 0 });
    const [userTicket, setUserTicket] = useState(null);
    const [notification, setNotification] = useState('');
    const [loading, setLoading] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        // Check localStorage for existing ticket
        const ticketId = localStorage.getItem('userTicketId');
        if (ticketId) {
            const ticketRef = doc(db, 'tickets', ticketId);
            const unsubTicket = onSnapshot(ticketRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserTicket({ id: docSnap.id, ...docSnap.data() });
                }
            });
            return () => unsubTicket();
        }
    }, []);

    useEffect(() => {
        const stateRef = doc(db, 'queue', 'state');
        const unsubState = onSnapshot(stateRef, (docSnap) => {
            const state = docSnap.data() || { currentNumber: 0 };
            setCurrentNumber(state.currentNumber);

            const ticketsQuery = query(
                collection(db, 'tickets'),
                where('date', '==', today)
            );

            const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
                let waiting = 0, called = 0, missed = 0, done = 0;
                
                snapshot.forEach((doc) => {
                    const ticket = doc.data();
                    if (ticket.done) {
                        done++;
                    } else if (ticket.number < state.currentNumber) {
                        missed++;
                    } else if (ticket.number === state.currentNumber) {
                        called++;
                    } else {
                        waiting++;
                    }
                });

                setStats({ waiting, called, missed, done });
            });

            return () => unsubTickets();
        });

        return () => unsubState();
    }, [today]);

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 3000);
    };

    const handleTakeQueue = async () => {
        setLoading(true);
        try {
            const generateTicket = httpsCallable(functions, 'generateTicket');
            const result = await generateTicket();
            const { ticketId, number } = result.data;

            localStorage.setItem('userTicketId', ticketId);
            setUserTicket({ id: ticketId, number });
            showNotification(`Nomor Antrian Anda: ${number}`);
        } catch (error) {
            showNotification('Gagal mengambil nomor: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <div style={{
                width: '75px',
                background: '#8EDCFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 0',
                boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: '#0284c7',
                    marginBottom: '40px'
                }}>Q</div>
            </div>

            {/* Main Content */}
            <div style={{ 
                flex: 1, 
                padding: '30px 50px',
                background: 'linear-gradient(135deg, #D6F2FF 0%, #BFE8FF 100%)'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '40px',
                    paddingBottom: '20px',
                    borderBottom: '2px solid rgba(142, 220, 255, 0.3)'
                }}>
                    <h1 style={{ fontSize: '32px', color: '#0c4a6e' }}>Queue System</h1>
                    <div style={{ 
                        background: 'rgba(255,255,255,0.5)', 
                        padding: '10px 20px',
                        borderRadius: '12px',
                        color: '#0369a1'
                    }}>
                        {new Date().toLocaleDateString('id-ID')}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                    {/* Queue Number Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '30px',
                        padding: '60px 40px',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            fontSize: '180px',
                            fontWeight: '700',
                            color: '#0c4a6e',
                            borderBottom: '4px solid #0284c7',
                            paddingBottom: '20px',
                            marginBottom: '30px'
                        }}>
                            {currentNumber}
                        </div>

                        {!userTicket ? (
                            <button onClick={handleTakeQueue} disabled={loading} style={{
                                background: 'white',
                                color: '#0369a1',
                                border: '3px solid #8EDCFF',
                                padding: '18px 50px',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 6px 20px rgba(14,165,233,0.2)'
                            }}>
                                {loading ? 'Memproses...' : 'Ambil Nomor Antrian'}
                            </button>
                        ) : (
                            <div style={{
                                marginTop: '30px',
                                padding: '25px',
                                background: 'linear-gradient(135deg, #BFE8FF 0%, #D6F2FF 100%)',
                                borderRadius: '20px'
                            }}>
                                <p style={{ color: '#0369a1', marginBottom: '10px' }}>Nomor Antrian Anda</p>
                                <div style={{ fontSize: '48px', fontWeight: '700', color: '#0c4a6e' }}>
                                    {userTicket.number}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{
                            background: 'rgba(191,232,255,0.5)',
                            padding: '35px 25px',
                            borderRadius: '25px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '56px', fontWeight: '700', color: '#0369a1' }}>
                                {stats.waiting}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
                                Waiting
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(191,232,255,0.5)',
                            padding: '35px 25px',
                            borderRadius: '25px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '56px', fontWeight: '700', color: '#0369a1' }}>
                                {stats.called}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
                                Called
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255,141,141,0.3)',
                            padding: '35px 25px',
                            borderRadius: '25px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '56px', fontWeight: '700', color: '#dc2626' }}>
                                {stats.missed}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#991b1b' }}>
                                Missed
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(161,255,170,0.4)',
                            padding: '35px 25px',
                            borderRadius: '25px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '56px', fontWeight: '700', color: '#16a34a' }}>
                                {stats.done}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#166534' }}>
                                Done
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div style={{
                        position: 'fixed',
                        top: '30px',
                        right: '30px',
                        background: 'white',
                        padding: '20px 30px',
                        borderRadius: '15px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        borderLeft: '5px solid #0284c7'
                    }}>
                        {notification}
                    </div>
                )}
            </div>
        </div>
    );
}