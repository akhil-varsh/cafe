'use client';

import { FormEvent, useState } from 'react';
import menuData from '@/data/dishes.json';

type MenuItem = { id: string; name: string; price: number; published: boolean; cafe_slug: string; is_new: boolean; todays_special: boolean };
type OrderItem = { dish_id: string; dish_name: string; quantity: number; unit_price: number; customizations: { no_cheese?: boolean } };
type Order = { id: string; table_label: string; guest_name: string; notes: string; status: string; total: number; created_at: string; order_items: OrderItem[] };

const statuses = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
const demoMenu: MenuItem[] = menuData.map(({ id, name, price, is_new, todays_special }) => ({ id, name, price, published: true, cafe_slug: 'savour', is_new, todays_special }));
const demoOrders: Order[] = [
  { id: '71e634aa-demo-4000-8000-000000000001', table_label: 'Table 7', guest_name: 'Maya', notes: 'Sauce on the side, please.', status: 'received', total: 897, created_at: '2026-10-22T07:40:00.000Z', order_items: [{ dish_id: 'signature-burger', dish_name: 'The Signature Burger', quantity: 2, unit_price: 349, customizations: { no_cheese: false } }, { dish_id: 'iced-latte', dish_name: 'Slow Morning Latte', quantity: 1, unit_price: 199, customizations: {} }] },
  { id: '84f957bc-demo-4000-8000-000000000002', table_label: 'Table 3', guest_name: 'Aarav', notes: '', status: 'preparing', total: 718, created_at: '2026-10-22T07:32:00.000Z', order_items: [{ dish_id: 'garden-pizza', dish_name: 'Garden Margherita', quantity: 1, unit_price: 429, customizations: { no_cheese: true } }, { dish_id: 'pancakes', dish_name: 'Sunday Pancakes', quantity: 1, unit_price: 289, customizations: {} }] },
  { id: '09ca182d-demo-4000-8000-000000000003', table_label: 'Pickup · Noor', guest_name: 'Noor', notes: 'Please pack cutlery.', status: 'ready', total: 698, created_at: '2026-10-22T07:18:00.000Z', order_items: [{ dish_id: 'signature-burger', dish_name: 'The Signature Burger', quantity: 2, unit_price: 349, customizations: { no_cheese: true } }] },
];

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [demo, setDemo] = useState(false);
  const [cafeSlugs, setCafeSlugs] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  function headers(accessToken: string, prefer?: string) {
    return { apikey: key!, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) };
  }

  async function loadWorkspace(accessToken: string, allowed: string[]) {
    const cafeFilter = allowed.map(encodeURIComponent).join(',');
    const [menuResponse, ordersResponse] = await Promise.all([
      fetch(`${url}/rest/v1/dishes?select=id,name,price,published,cafe_slug,is_new,todays_special&cafe_slug=in.(${cafeFilter})&order=sort_order`, { headers: headers(accessToken) }),
      fetch(`${url}/rest/v1/orders?select=id,table_label,guest_name,notes,status,total,created_at,order_items(dish_id,dish_name,quantity,unit_price,customizations)&cafe_slug=in.(${cafeFilter})&order=created_at.desc&limit=50`, { headers: headers(accessToken) }),
    ]);
    if (!menuResponse.ok || !ordersResponse.ok) throw new Error('Could not load your cafe workspace.');
    setItems(await menuResponse.json());
    setOrders(await ordersResponse.json());
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (!url || !key) throw new Error('Database connection is not configured.');
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const auth = await response.json();
      if (!response.ok) throw new Error('Sign-in failed. Check your email and password.');
      const membership = await fetch(`${url}/rest/v1/cafe_members?select=cafe_slug`, { headers: headers(auth.access_token) });
      const members = await membership.json();
      if (!membership.ok || !Array.isArray(members) || !members.length) throw new Error('This account has no cafe membership. Ask the project owner to grant access.');
      const allowed = members.map((member: { cafe_slug: string }) => member.cafe_slug);
      await loadWorkspace(auth.access_token, allowed);
      setCafeSlugs(allowed);
      setToken(auth.access_token);
      setPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function save(item: MenuItem) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      setMessage('Enter a valid whole-rupee price.');
      return;
    }
    if (demo) {
      setMessage(`${item.name} updated in this demo workspace.`);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${url}/rest/v1/dishes?id=eq.${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: headers(token, 'return=representation'), body: JSON.stringify({ price: item.price, published: item.published, is_new: item.is_new, todays_special: item.todays_special, updated_at: new Date().toISOString() }),
      });
      const changed = await response.json();
      if (!response.ok || !changed.length) throw new Error('Save failed. Your session may have expired.');
      setMessage(`${item.name} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(order: Order, status: string) {
    if (demo) {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      setMessage(`Demo order ${order.id.slice(0, 8).toUpperCase()} is now ${status}.`);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH', headers: headers(token, 'return=representation'), body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Could not update this order.');
      const changed = await response.json();
      if (!changed.length) throw new Error('No order was updated. Check your cafe access.');
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      setMessage(`Order ${order.id.slice(0, 8).toUpperCase()} is now ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this order.');
    } finally {
      setBusy(false);
    }
  }

  async function refreshOrders() {
    if (demo) {
      setMessage('Demo orders are already up to date.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await loadWorkspace(token, cafeSlugs);
      setMessage('Orders refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not refresh orders.');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setToken('');
    setItems([]);
    setOrders([]);
    setCafeSlugs([]);
    setDemo(false);
    setMessage('Signed out of this workspace.');
  }

  function enterDemo() {
    setEmail('manager@demo.savour.cafe');
    setToken('demo-workspace');
    setDemo(true);
    setItems(demoMenu);
    setOrders(demoOrders);
    setMessage('You are viewing isolated sample data. Changes remain in this browser session.');
  }

  return <>
    <header className="topbar"><a className="wordmark" href="/">savour<span>✳</span></a><span>{demo ? 'Demo workspace · manager@demo.savour.cafe' : 'Cafe workspace'}</span>{token && <button className="bag-button" onClick={signOut}>Sign out</button>}</header>
    <main className="admin">
      <div className="eyebrow">A LITTLE CARE BEHIND EVERY PLATE</div>
      <h1 className="admin-title">Your cafe, at a glance.</h1>
      {!token ? <form className="admin-login" onSubmit={login}>
        <label>Email<input type="email" autoComplete="username" placeholder="manager@yourcafe.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to your cafe →'}</button>
        <div className="demo-entry"><span>Or preview the complete experience</span><button type="button" onClick={enterDemo}>Enter demo workspace →</button><small>Uses manager@demo.savour.cafe and isolated sample data.</small></div>
        <p>Live access is reserved for cafe members provisioned by the project owner.</p>
      </form> : <>
        <div className="admin-tabs"><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders <span>{orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length}</span></button><button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>Menu <span>{items.length}</span></button><button className="refresh" onClick={refreshOrders} disabled={busy}>↻ Refresh</button></div>
        {tab === 'orders' ? <section className="order-board">
          {!orders.length ? <div className="empty"><span className="manifesto-icon">♧</span><h3>No orders yet.</h3><p>New customer orders will appear here.</p></div> : orders.map((order) => <article className="order-card" key={order.id}>
            <div className="order-head"><div><span className="order-number">#{order.id.slice(0, 8).toUpperCase()}</span><h2>{order.table_label}</h2><p>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{order.guest_name ? ` · ${order.guest_name}` : ''}</p></div><strong>₹{order.total}</strong></div>
            <div className="order-lines">{order.order_items.map((line, index) => <p key={`${line.dish_id}-${index}`}><b>{line.quantity}×</b> {line.dish_name}{line.customizations?.no_cheese ? <small> · no cheese</small> : null}</p>)}</div>
            {order.notes && <p className="kitchen-note">“{order.notes}”</p>}
            <label className="status-picker">Order status<select value={order.status} disabled={busy} onChange={(event) => updateStatus(order, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
          </article>)}
        </section> : <section>{items.map((item) => <form className="admin-row" key={item.id} onSubmit={(event) => { event.preventDefault(); save(item); }}><strong>{item.name}</strong><label>Price · ₹<input aria-label={`Price for ${item.name}`} type="number" min={0} step={1} required value={item.price} onChange={(event) => setItems((current) => current.map((dish) => dish.id === item.id ? { ...dish, price: event.target.valueAsNumber } : dish))} /></label><label><input type="checkbox" checked={item.published} onChange={(event) => setItems((current) => current.map((dish) => dish.id === item.id ? { ...dish, published: event.target.checked } : dish))} /> Published</label><label><input type="checkbox" checked={item.todays_special} onChange={(event) => setItems((current) => current.map((dish) => dish.id === item.id ? { ...dish, todays_special: event.target.checked } : dish))} /> Today’s special</label><label><input type="checkbox" checked={item.is_new} onChange={(event) => setItems((current) => current.map((dish) => dish.id === item.id ? { ...dish, is_new: event.target.checked } : dish))} /> New</label><button className="primary" disabled={busy}>Save</button></form>)}</section>}
      </>}
      <p role="status" className="admin-message">{message}</p>
    </main>
  </>;
}
