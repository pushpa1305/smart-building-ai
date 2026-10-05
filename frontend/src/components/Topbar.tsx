import { Bell, Search, User } from "lucide-react";

interface TopbarProps {
  activePage: string;
}

export default function Topbar({ activePage }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>{activePage}</h1>
        <p>Smart Building Energy & Facility Management</p>
      </div>

      <div className="topbar-actions">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search..." />
        </div>

        <button className="icon-button">
          <Bell size={20} />

          <span className="notification-dot"></span>
        </button>

        <div className="profile">
          <div className="profile-avatar">
            <User size={19} />
          </div>

          <div>
            <strong>Facility Manager</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}