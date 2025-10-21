"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";

export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4">
      <div className="border border-gray-700 rounded-2xl p-8 bg-gray-800/50 backdrop-blur-md shadow-lg max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <ShieldOff className="h-14 w-14 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold">Brak dostępu</h1>
        <p className="text-gray-400 text-sm">
          Nie masz uprawnień, aby wyświetlić tę stronę.
        </p>
        <Link href="/" className="inline-block">
          <div className="mt-4 bg-gray-700 hover:bg-gray-600 transition-colors duration-200 text-white px-4 py-2 rounded-md">
            Powrót do strony głównej
          </div>
        </Link>
        <Link href="/Login" className="inline-block">
          <div className=" bg-gray-700 hover:bg-gray-600 transition-colors duration-200 text-white px-4 py-2 rounded-md">
            Powrót do strony logowania
          </div>
        </Link>
      </div>
    </div>
  );
}