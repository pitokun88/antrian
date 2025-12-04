import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import '../../../admin/style.css';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [currentCalled, setCurrentCalled] = useState(0);
    const [stats, setStats] = useState({ waiting: 0, called: 0, missed: 0, done: 0 });
    const [notification, setNotification] = useState('');

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (!user) navigate('/admin/login');
        });

        return () => unsubAuth();
    }, [navigate]);

    useEffect(() => {
        const stateRef = doc(db, 'queue', 'state');
        const unsubState = onSnapshot(stateRef, (docSnap) => {
            const state = docSnap.data() || { currentNumber: 0 };
            setCurrentCalled(state.currentNumber);

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

    const handleCallNext = async () => {
        try {
            const callNext = httpsCallable(functions, 'callNext');
            await callNext({ setDone: true });
            showNotification('Nomor berikutnya dipanggil & ditandai selesai');
        } catch (error) {
            showNotification('Error: ' + error.message);
        }
    };

    const handleSkip = async () => {
        try {
            const callNext = httpsCallable(functions, 'callNext');
            await callNext({ setDone: false });
            showNotification('Nomor dilewati (Missed)');
        } catch (error) {
            showNotification('Error: ' + error.message);
        }
    };

    const handleReset = async () => {
        if (confirm('Yakin reset antrian hari ini?')) {
            try {
                const resetQueue = httpsCallable(functions, 'resetQueue');
                await resetQueue();
                showNotification('Antrian telah direset');
            } catch (error) {
                showNotification('Error: ' + error.message);
            }
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/admin/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <div style={{
                width: '250px',
                background: '#8EDCFF',
                padding: '20px',
                boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ color: '#0c4a6e', marginBottom: '40px' }}>Admin Panel</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <a href="#" style={{ 
                        padding: '12px', 
                        background: 'rgba(255,255,255,0.3)', 
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: '#0c4a6e'
                    }}>Dashboard</a>
                    <button onClick={handleLogout} style={{
                        padding: '12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer'
                    }}>Logout</button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '30px 50px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
                <h1 style={{ color: '#0c4a6e', marginBottom: '30px' }}>Admin Dashboard</h1>
                <p style={{ marginBottom: '30px', color: '#0369a1' }}>
                    {new Date().toLocaleDateString('id-ID')}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                    {/* Current Called */}
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '20px',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '120px', fontWeight: '700', color: '#0c4a6e' }}>
                            {currentCalled}
                        </div>
                        <h2 style={{ color: '#0369a1', marginBottom: '20px' }}>Sedang Dipanggil</h2>
                        <button onClick={handleCallNext} style={{
                            width: '100%',
                            padding: '14px',
                            background: '#0284c7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            marginBottom: '10px',
                            fontSize: '16px'
                        }}>Call Next → Done</button>
                        <button onClick={handleSkip} style={{
                            width: '100%',
                            padding: '14px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            fontSize: '16px'
                        }}>Skip → Missed</button>
                        <button onClick={handleReset} style={{
                            width: '100%',
                            padding: '14px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}>Reset Antrian</button>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{
                            background: '#BFE8FF',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#0369a1' }}>
                                {stats.waiting}
                            </div>
                            <div style={{ fontWeight: '600', color: '#0c4a6e' }}>Waiting</div>
                        </div>
                        <div style={{
                            background: '#BFE8FF',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#0369a1' }}>
                                {stats.called}
                            </div>
                            <div style={{ fontWeight: '600', color: '#0c4a6e' }}>Called</div>
                        </div>
                        <div style={{
                            background: '#FF8D8D',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#dc2626' }}>
                                {stats.missed}
                            </div>
                            <div style={{ fontWeight: '600', color: '#991b1b' }}>Missed</div>
                        </div>
                        <div style={{
                            background: '#A1FFAA',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#16a34a' }}>
                                {stats.done}
                            </div>
                            <div style={{ fontWeight: '600', color: '#166534' }}>Done</div>
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