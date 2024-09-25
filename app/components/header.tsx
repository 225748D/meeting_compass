import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    <header className="flex items-center p-2 bg-gray-200">
      <Link href="/" className="flex items-center no-underline text-inherit">
          <img src="../icon.svg" alt="Logo" className="h-10 mr-2" />
          <h1 className="m-0">Meeting Compass</h1>
      </Link>
    </header>
  );
};

export default Header;
