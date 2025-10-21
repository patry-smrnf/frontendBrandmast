'use client';

import React, { useState, useCallback } from "react";
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { apiFetch } from "@/utils/apiFetch";

import { toast } from "sonner";

export default function Login() {

    //move user
    const router = useRouter();

    const [login, setLogin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            apiFetch<AuthResponse>("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: login
                })
            })
            .then((res) => {
                toast.info(res.message);
                router.push("/");
            })
            .catch((err) => {
                setError("Console: " + err + " API: " + err.message);
                toast.error(String(err));
            })
            .finally(() => {
                setLoading(false);
            });
        },
        [login, router]
    );

    return (
        <div className="min-h-screen flex items-center justify-center  bg-gradient-to-b from-zinc-950 via-zinc-950 to-black px-4">
        <Card className="w-full max-w-md p-8 shadow-2xl rounded-2xl border-zinc-800/60  bg-zinc-900/60 backdrop-blur-md ">
            <CardHeader>
                <CardTitle className="text-3xl font-bold text-center text-white">Brandmastuj</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                <Label htmlFor="user_login" className="text-zinc-300">Login</Label>
                <Input
                    id="user_login"
                    type="text"
                    placeholder="PLH0000"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="mt-2 bg-zinc-950/70 border-zinc-800 text-white placeholder-zinc-400 focus:ring-blue-500"
                    required disabled={loading}/>
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
                    {loading ? "Logowanie..." : "Zaloguj się"}
                </Button>
            </form>
            <p className="mt-6 text-center text-sm text-zinc-400">
                Problem z logowaniem?{" "}
                <a className="text-purple-600 hover:underline">
                Pisz do mnie na WhatsApp
                </a>
            </p>
            </CardContent>
        </Card>
        </div>
    );
}