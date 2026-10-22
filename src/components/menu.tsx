'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { type Dish, photo } from '@/lib/menu';

const Viewer = dynamic(() => import('./viewer'), {
  ssr: false,
  loading: () => <div className="viewer">Preparing 3D…</div>,
});

type Line = { id: string; quantity: number; noCheese: boolean };
type Confirmation = { order_id: string; order_number: string; total: number };

const categories = ['All dishes', 'Burgers', 'Pizza', 'Bowls & plates', 'Sweet treats', 'Coffee & drinks'];

export default function Menu({ dishes, live }: { dishes: Dish[]; live: boolean }) {
  const [category, setCategory] = useState('All dishes');
  const [query, setQuery] = useState('');
  const [veg, setVeg] = useState(false);
  const [selected, setSelected] = useState<Dish | null>(null);
  const [show3d, setShow3d] = useState(false);
  const [noCheese, setNoCheese] = useState(false);
  const [cart, setCart] = useState<Line[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [guestName, setGuestName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const requestToken = useRef('');
  const detail = useRef<HTMLDialogElement>(null);
  const bag = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savour-cart') || '[]');
      if (Array.isArray(saved)) {
        setCart(saved
          .filter((line: Line) => dishes.some((dish) => dish.id === line.id) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20)
          .map((line: Line) => ({ id: line.id, quantity: line.quantity, noCheese: Boolean(line.noCheese) })));
      }
    } catch {}
    const table = new URLSearchParams(window.location.search).get('table')?.trim() || '';
    if (/^[a-zA-Z0-9 _-]{1,24}$/.test(table)) setTableLabel(table);
    setHydrated(true);
  }, [dishes]);

  useEffect(() => {
    if (hydrated) localStorage.setItem('savour-cart', JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + (dishes.find((dish) => dish.id === line.id)?.price || 0) * line.quantity, 0);
  const filtered = dishes.filter((dish) =>
    (category === 'All dishes' || category === dish.category) &&
    (!veg || dish.vegetarian) &&
    `${dish.name} ${dish.ingredients.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  );

  function open(dish: Dish | undefined, ar = false) {
    if (!dish) {
      document.getElementById('menu')?.scrollIntoView();
      return;
    }
    setSelected(dish);
    setNoCheese(false);
    setShow3d(ar);
    detail.current?.showModal();
  }

  function add() {
    if (!selected) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === selected.id && line.noCheese === noCheese);
      return existing
        ? current.map((line) => line === existing ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line)
        : [...current, { id: selected.id, quantity: 1, noCheese }];
    });
    setToast(`${selected.name} added to your bag`);
    detail.current?.close();
  }

  function change(index: number, delta: number) {
    setCart((current) => current
      .map((line, position) => position === index ? { ...line, quantity: Math.min(20, line.quantity + delta) } : line)
      .filter((line) => line.quantity > 0));
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      setOrderError('Ordering is not configured yet.');
      return;
    }
    if (!cart.length) return;
    setSubmitting(true);
    setOrderError('');
    if (!requestToken.current) requestToken.current = crypto.randomUUID();
    try {
      const response = await fetch(`${url}/functions/v1/submit-order`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafe_slug: 'savour',
          table_label: tableLabel,
          guest_name: guestName,
          notes,
          request_token: requestToken.current,
          items: cart.map((line) => ({ dish_id: line.id, quantity: line.quantity, no_cheese: line.noCheese })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'The cafe could not receive your order.');
      const result = Array.isArray(payload) ? payload[0] : payload;
      setConfirmation(result);
      setCart([]);
      setNotes('');
      requestToken.current = '';
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'The cafe could not receive your order.');
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <header className="topbar">
      <a className="wordmark" href="/">savour<span>✳</span></a>
      <div className="cafe-label"><span className="status-dot" /> THE LITTLE TABLE <span className="muted">/</span> DEMO CAFE</div>
      <button className="bag-button" onClick={() => bag.current?.showModal()}>Your bag <span>{count}</span></button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="line" /> A LITTLE CURIOSITY. A LOT OF FLAVOUR.</div>
          <h1>Good food.<br />No surprises.<span className="spark">✳</span></h1>
          <p>Meet your next favourite before the first bite.<br className="desktop" /> Explore the ingredients. See it on your table.<br className="desktop" /> Order with a little more confidence.</p>
          <a className="primary" href="#menu">Find your flavour <span>↗</span></a>
          <div className="hero-foot"><span>◎</span> A new perspective on your plate.</div>
        </div>
        <div className="hero-art">
          <img src={photo(dishes[0], 1200)} alt="Illustrative gourmet burger with fresh vegetables" fetchPriority="high" />
          <div className="floating-label"><span className="scan-icon">⌗</span><div>Looks good?<small>See it in your space.</small></div><button aria-label="Explore burger in 3D" onClick={() => open(dishes[0], true)}>↗</button></div>
          <div className="round-stamp">SEE IT.<br /><b>◎</b><br />SAVOUR IT.</div>
          <span className="photo-credit">ILLUSTRATIVE MENU PHOTOGRAPHY</span>
        </div>
      </section>

      <section className="trust-strip"><span>✳ Made for curious appetites</span><span>◎ Explore in 3D & AR</span><span>♧ Know your ingredients</span><span>↗ Choose with confidence</span></section>

      <section id="menu" className="menu-section">
        <div className="section-heading"><div><div className="eyebrow">FRESH PICKS, HAPPY PLATES</div><h2>What are you craving?</h2></div><label className="search"><span>⌕</span><input aria-label="Search dishes or ingredients" placeholder="Find your next favourite…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <div className="filter-row"><nav className="categories" aria-label="Menu categories">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</nav><label className="veg-toggle"><input type="checkbox" checked={veg} onChange={(event) => setVeg(event.target.checked)} /> Veg only</label></div>
        <div className="menu-meta"><span>{filtered.length} dishes to fall for</span><span>Prices in INR · {live ? 'Live menu' : 'Demo menu'}</span></div>
        <div className="dish-grid">{filtered.map((dish) => <article className="dish-card" key={dish.id}>
          <button className="dish-image" onClick={() => open(dish, Boolean(dish.model))} aria-label={dish.model ? `Explore ${dish.name} in 3D` : `Explore ${dish.name}`}><img src={photo(dish)} alt={dish.name} loading="lazy" /><span className="dish-tag">{dish.tag}</span>{dish.model && <span className="ar-chip">◎ EXPLORE IN 3D</span>}<span className={`diet-dot ${dish.vegetarian ? 'vegetarian' : ''}`} title={dish.vegetarian ? 'Vegetarian recipe' : 'Non-vegetarian recipe'} /></button>
          <div className="dish-info"><div className="dish-title"><button onClick={() => open(dish)}><h3>{dish.name}</h3></button><span>₹{dish.price}</span></div><p>{dish.description}</p><div className="dish-bottom"><span>{dish.portion}</span><button onClick={() => open(dish)} aria-label={`View ${dish.name}`}>↗</button></div></div>
        </article>)}</div>
        {!filtered.length && <div className="empty"><h3>No dishes found.</h3><p>Try another ingredient or explore the full menu.</p><button className="primary" onClick={() => { setQuery(''); setVeg(false); setCategory('All dishes'); }}>Show all dishes</button></div>}
      </section>

      <section className="manifesto"><span className="manifesto-icon">✳</span><div><div className="eyebrow">A BETTER KIND OF MENU</div><h2>Less guessing.<br /><i>More enjoying.</i></h2></div><p>Because the best meals start with knowing what’s on your plate. Every ingredient, every little detail, a little closer.<small>This is a demonstration menu. Photography and 3D models are illustrative; serving details need cafe verification.</small></p></section>
    </main>

    <footer><a className="wordmark" href="/">savour<span>✳</span></a><span>See it before you order it.</span><span>Crafted for the curious.</span></footer>
    {count > 0 && <button className="mobile-cart primary" onClick={() => bag.current?.showModal()}><span>{count} {count === 1 ? 'item' : 'items'} · ₹{total}</span><span>View your bag →</span></button>}

    <dialog ref={detail} className="dish-dialog" onClick={(event) => { if (event.target === detail.current) detail.current.close(); }}>
      {selected && <><button className="close" aria-label="Close dish" onClick={() => detail.current?.close()}>×</button><div className="detail-visual">{show3d && selected.model ? <Viewer src={selected.model} name={selected.name} poster={photo(selected, 1000)} /> : <img src={photo(selected, 1000)} alt={selected.name} />}<div className="view-tabs"><button className={!show3d ? 'active' : ''} onClick={() => setShow3d(false)}>Photograph</button>{selected.model && <button className={show3d ? 'active' : ''} onClick={() => setShow3d(true)}>◎ 3D & AR</button>}</div></div><div className="detail-content"><div className="eyebrow">{selected.category} / {selected.vegetarian ? 'VEGETARIAN RECIPE' : 'NON-VEGETARIAN'}</div><h2>{selected.name}</h2><p>{selected.description}</p><div className="portion"><span>YOUR PORTION</span><strong>{selected.portion}</strong></div>{show3d && <p className="notice">Illustrative model, not a verified serving. Table placement is available on compatible phones. AR needs a secure HTTPS connection.</p>}<h4>Good things inside</h4><div className="ingredients">{selected.ingredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div><h4>Made with care</h4><p>{selected.preparation}</p><div className="allergens"><strong>Allergens: {selected.allergens.join(', ')}</strong><p>Cross-contact information is not verified. Confirm dietary requirements with cafe staff.</p></div><details><summary>Nutritional information</summary><p>Verified nutritional information is not available for this demo dish.</p></details>{selected.ingredients.some((ingredient) => /cheddar|mozzarella|parmesan/i.test(ingredient)) && <label className="customize"><input type="checkbox" checked={noCheese} onChange={(event) => setNoCheese(event.target.checked)} /><span>Leave out the cheese<small>Same price · preview shows the standard dish</small></span></label>}<button className="primary add-button" onClick={add}><span>Add to your bag</span><span>₹{selected.price} +</span></button></div></>}
    </dialog>

    <dialog ref={bag} className="cart-dialog" onClick={(event) => { if (event.target === bag.current) bag.current.close(); }}>
      <button className="close" aria-label="Close bag" onClick={() => bag.current?.close()}>×</button>
      {confirmation ? <div className="order-confirmation"><span className="confirmation-mark">✓</span><div className="eyebrow">ORDER RECEIVED</div><h2>We’ve sent it to the kitchen.</h2><p>Order <strong>#{confirmation.order_number}</strong> · {tableLabel}</p><p className="notice">Your confirmed total is ₹{confirmation.total}. Payment is handled by the cafe for this pilot.</p><button className="primary add-button" onClick={() => { setConfirmation(null); bag.current?.close(); }}>Back to the menu <span>↗</span></button></div> : <>
        <div className="eyebrow">SOMETHING GOOD IS COMING</div><h2>Your bag <span>({count})</span></h2>
        {!count ? <div className="empty"><span className="manifesto-icon">♧</span><h3>A little room for something lovely.</h3><button className="primary" onClick={() => bag.current?.close()}>Explore the menu</button></div> : <form onSubmit={submitOrder}>
          {cart.map((line, index) => { const dish = dishes.find((item) => item.id === line.id)!; return <div className="cart-line" key={`${line.id}-${line.noCheese}`}><img src={photo(dish, 180)} alt="" /><div><h3>{dish.name}</h3><p>{line.noCheese ? 'Without cheese' : 'Standard preparation'}</p><div className="quantity"><button type="button" onClick={() => change(index, -1)} aria-label={`Remove one ${dish.name}`}>−</button><span>{line.quantity}</span><button type="button" onClick={() => change(index, 1)} aria-label={`Add one ${dish.name}`}>+</button></div></div><strong>₹{dish.price * line.quantity}</strong></div>; })}
          <div className="subtotal"><span>Subtotal</span><strong>₹{total}</strong></div>
          <div className="checkout-fields"><label>Table or pickup name<input required maxLength={24} placeholder="e.g. Table 7" value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} /></label><label>Your name <span>optional</span><input maxLength={60} autoComplete="name" placeholder="So we know who to call" value={guestName} onChange={(event) => setGuestName(event.target.value)} /></label><label>Note for the kitchen <span>optional</span><textarea maxLength={300} placeholder="Add a preparation note" value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>
          <p className="notice">Your final total is calculated from the cafe’s live prices. Payment is handled by the cafe during this pilot.</p>
          {orderError && <p className="order-error" role="alert">{orderError}</p>}
          <button className="primary add-button" disabled={submitting}><span>{submitting ? 'Sending to the kitchen…' : 'Place order'}</span><span>₹{total} →</span></button>
        </form>}
      </>}
    </dialog>
    <div className={`toast ${toast ? 'visible' : ''}`} role="status">✓ {toast}</div>
  </>;
}
