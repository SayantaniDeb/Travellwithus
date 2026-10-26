import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../Firebase';

export default function TodoReminders({ user }) {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    setAlerts([]);
    if (!user || !db) return;
    let todos = [], active = true;
    const check = () => {
      for (const todo of todos) {
        if (todo.completed || !todo.remindAt || new Date(todo.remindAt).getTime() > Date.now() || !Number.isFinite(new Date(todo.remindAt).getTime())) continue;
        const key = `todo-reminder:${user.uid}:${todo.id}:${todo.remindAt}`;
        let delivered = false;
        try { delivered = localStorage.getItem(key) === 'sent'; } catch { /* In-app fallback still works. */ }
        if (delivered || todo.delivered) continue;
        todo.delivered = true;
        try { localStorage.setItem(key, 'sent'); } catch { /* Session deduplication remains active. */ }
        setAlerts(previous => [...previous, { ...todo, key }]);
        if ('Notification' in window && Notification.permission === 'granted') {
          Promise.resolve(navigator.serviceWorker ? navigator.serviceWorker.getRegistration('/todo-notifications/') : null).then(registration => {
            if (!active) return;
            if (registration?.active) return registration.showNotification('Travel checklist reminder', { body: todo.item, tag: key, data: { url: '/Todolist' } });
            const notification = new Notification('Travel checklist reminder', { body: todo.item, tag: key });
            notification.onclick = () => { window.focus(); window.location.assign('/Todolist'); };
          }).catch(() => { /* The in-app reminder remains visible. */ });
        }
      }
    };
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'todos'), snapshot => {
      todos = snapshot.docs.map(document => ({ id: document.id, ...document.data() })); check();
    }, () => {});
    const timer = setInterval(check, 10000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { active = false; unsubscribe(); clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [user]);
  if (!alerts.length) return null;
  return <aside aria-label="Todo reminders" aria-live="polite" className="fixed inset-x-4 top-20 z-[70] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white p-4 shadow-xl"><div className="flex justify-between gap-3"><Link to="/Todolist" className="font-semibold text-blue-700">Checklist reminders</Link><button aria-label="Dismiss reminders" onClick={() => setAlerts([])}>Dismiss</button></div><ul className="mt-2 max-h-40 overflow-auto">{alerts.map(alert => <li className="py-1 text-sm" key={alert.key}>{alert.item}</li>)}</ul></aside>;
}
