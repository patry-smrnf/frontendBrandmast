"use client";

import React, { useState } from "react";
import { Plus, Users, UserCheck, Settings, Wifi, WifiOff, Shield, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Hardcoded sample data
interface Team {
  id: string;
  name: string;
  supervisor: {
    name: string;
    email: string;
  };
  brandmastersCount: number;
  secondApiConnected: boolean;
  createdAt: string;
  territory: string;
  status: "active" | "inactive";
}

const SAMPLE_TEAMS: Team[] = [
  {
    id: "1",
    name: "Team Alpha",
    supervisor: {
      name: "Jan Kowalski",
      email: "jan.kowalski@example.com",
    },
    brandmastersCount: 12,
    secondApiConnected: true,
    createdAt: "2024-01-15",
    territory: "Warszawa",
    status: "active",
  },
  {
    id: "2",
    name: "Team Beta",
    supervisor: {
      name: "Anna Nowak",
      email: "anna.nowak@example.com",
    },
    brandmastersCount: 8,
    secondApiConnected: true,
    createdAt: "2024-02-20",
    territory: "Kraków",
    status: "active",
  },
  {
    id: "3",
    name: "Team Gamma",
    supervisor: {
      name: "Piotr Wiśniewski",
      email: "piotr.wisniewski@example.com",
    },
    brandmastersCount: 15,
    secondApiConnected: false,
    createdAt: "2024-03-10",
    territory: "Gdańsk",
    status: "active",
  },
  {
    id: "4",
    name: "Team Delta",
    supervisor: {
      name: "Maria Lewandowska",
      email: "maria.lewandowska@example.com",
    },
    brandmastersCount: 6,
    secondApiConnected: true,
    createdAt: "2024-04-05",
    territory: "Wrocław",
    status: "active",
  },
  {
    id: "5",
    name: "Team Epsilon",
    supervisor: {
      name: "Krzysztof Dąbrowski",
      email: "krzysztof.dabrowski@example.com",
    },
    brandmastersCount: 10,
    secondApiConnected: false,
    createdAt: "2024-05-12",
    territory: "Poznań",
    status: "inactive",
  },
];

export default function AdminPanel() {
  const [teams] = useState<Team[]>(SAMPLE_TEAMS);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newSupervisorName, setNewSupervisorName] = useState("");
  const [newSupervisorEmail, setNewSupervisorEmail] = useState("");
  const [newTerritory, setNewTerritory] = useState("");

  const handleCreateTeam = () => {
    // This would normally make an API call
    console.log("Creating team:", {
      name: newTeamName,
      supervisor: { name: newSupervisorName, email: newSupervisorEmail },
      territory: newTerritory,
    });
    // Reset form
    setNewTeamName("");
    setNewSupervisorName("");
    setNewSupervisorEmail("");
    setNewTerritory("");
    setIsCreateDialogOpen(false);
  };

  // Calculate stats
  const totalBMs = teams.reduce((sum, team) => sum + team.brandmastersCount, 0);
  const activeTeams = teams.filter((t) => t.status === "active").length;
  const connectedToApi = teams.filter((t) => t.secondApiConnected).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              Admin Panel
            </h1>
            <p className="text-gray-400 text-sm mt-1">Zarządzaj zespołami i użytkownikami</p>
          </div>

          {/* Create Team Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj zespół
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-gray-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Utwórz nowy zespół</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Dodaj nowy zespół wraz z przełożonym
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-gray-300">
                    Nazwa zespołu
                  </Label>
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="np. Team Zeta"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisorName" className="text-gray-300">
                    Imię i nazwisko przełożonego
                  </Label>
                  <Input
                    id="supervisorName"
                    value={newSupervisorName}
                    onChange={(e) => setNewSupervisorName(e.target.value)}
                    placeholder="Jan Kowalski"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisorEmail" className="text-gray-300">
                    Email przełożonego
                  </Label>
                  <Input
                    id="supervisorEmail"
                    type="email"
                    value={newSupervisorEmail}
                    onChange={(e) => setNewSupervisorEmail(e.target.value)}
                    placeholder="jan.kowalski@example.com"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="territory" className="text-gray-300">
                    Terytorium
                  </Label>
                  <Input
                    id="territory"
                    value={newTerritory}
                    onChange={(e) => setNewTerritory(e.target.value)}
                    placeholder="Warszawa"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleCreateTeam}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Utwórz zespół
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Teams */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Wszystkie zespoły</p>
                  <p className="text-3xl font-bold text-white mt-1">{teams.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Teams */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Aktywne zespoły</p>
                  <p className="text-3xl font-bold text-white mt-1">{activeTeams}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total BMs */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Wszyscy BMs</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalBMs}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Connected */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Połączone API</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {connectedToApi}/{teams.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-cyan-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teams Grid */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Zarządzanie zespołami
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl hover:border-zinc-700 transition-all duration-200 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        {team.name}
                        {team.status === "active" ? (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        ) : (
                          <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-gray-500 text-xs mt-1">
                        {team.territory}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {team.secondApiConnected ? (
                        <div className="p-1.5 bg-green-500/10 rounded">
                          <Wifi className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-red-500/10 rounded">
                          <WifiOff className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  {/* Supervisor */}
                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                      Supervisor
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {team.supervisor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {team.supervisor.name}
                        </p>
                        <p className="text-gray-500 text-xs truncate">{team.supervisor.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-800">
                      <p className="text-xs text-gray-500">Brandmasters</p>
                      <p className="text-xl font-bold text-white mt-0.5">{team.brandmastersCount}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-800">
                      <p className="text-xs text-gray-500">Status API</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {team.secondApiConnected ? (
                          <span className="text-green-500">Połączony</span>
                        ) : (
                          <span className="text-red-500">Rozłączony</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <p className="text-xs text-gray-500">
                      Utworzono: {new Date(team.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                    <button className="text-blue-500 hover:text-blue-400 transition-colors p-1 opacity-0 group-hover:opacity-100">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-600 text-xs py-4">
          <p>Admin Panel v1.0 • Prototype with hardcoded data</p>
        </div>
      </div>
    </div>
  );
}


