const DATABASE = 'travelwithus-device';
const STORE = 'trips';
export const GUEST_TRIPS_CHANGED = 'travelwithus:device-trips';
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => { for (const name of [STORE, 'todos']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, {keyPath:'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Device storage is unavailable. Enable browser storage or sign in to save your trip.'));
    request.onblocked = () => reject(new Error('Close other TravelWithUs tabs and try saving again.'));
  });
}
async function transaction(mode, operation, name = STORE) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction(name, mode);
      const request = operation(tx.objectStore(name));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error('Could not save changes on this device. Storage may be full or unavailable.'));
    });
  } finally { database.close(); }
}
export async function listGuestTrips() {
  const trips = await transaction('readonly', store => store.getAll());
  return trips.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveGuestTrip(trip) {
  const value = { ...trip, id: trip.id || `device-${crypto.randomUUID()}`, updatedAt: Date.now(), createdAt: trip.createdAt || Date.now() };
  await transaction('readwrite', store => store.put(value));
  window.dispatchEvent(new CustomEvent(GUEST_TRIPS_CHANGED, { detail: { saved: true } }));
  return value;
}
export async function deleteGuestTrip(id) {
  await transaction('readwrite', store => store.delete(id));
  window.dispatchEvent(new Event(GUEST_TRIPS_CHANGED));
}

export async function listGuestTodos() { return transaction('readonly', store => store.getAll(), 'todos'); }
export async function saveGuestTodo(todo) {
  const value = {...todo,id:todo.id || `device-task-${crypto.randomUUID()}`,createdAt:todo.createdAt || Date.now()};
  await transaction('readwrite', store => store.put(value), 'todos');
  window.dispatchEvent(new CustomEvent(GUEST_TRIPS_CHANGED,{detail:{saved:true}}));
  return value;
}
export async function deleteGuestTodo(id) {
  await transaction('readwrite', store => store.delete(id), 'todos');
  window.dispatchEvent(new Event(GUEST_TRIPS_CHANGED));
}
