import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">🌐 DRRMS</div>
      <div className="navbar-links">
        <NavLink to="/volunteers">Resources</NavLink>
        <NavLink to="/request">Request</NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
