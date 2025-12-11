import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => (
  <footer className="py-2 mt-8 border-t border-gray-100">
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-1">
        Made by SmartSpend AI Team
      </p>
      <p className="text-[10px] text-gray-400">
        © {new Date().getFullYear()} • Secure Expense Tracking
      </p>
    </div>
  </footer>
);

export default Footer;