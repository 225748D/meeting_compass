import React from 'react';

const Header: React.FC = () => {
  return (
    <header style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
      <img src="../icon.svg" alt="Logo" style={{ height: '40px', marginRight: '10px' }} />
      <h1 style={{ margin: 0 }}>Meeting Compass</h1>
    </header>
  );
};

export default Header;
