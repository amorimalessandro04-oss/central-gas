import { Link } from 'react-router-dom';

export default function Header({ titulo = 'Central Gás', children }) {
  return (
    <header className="header">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none' }}>
        <img src="/icon-192.png" alt="Central Gás" />
        <h1>{titulo}</h1>
      </Link>
      <div className="acoes">{children}</div>
    </header>
  );
}
