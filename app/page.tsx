"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Train,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  ExternalLink,
  Server,
  LinkIcon,
  Upload,
  FileText,
  Loader2,
  Database,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"
import { createClient } from "@supabase/supabase-js"

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

interface TrainSchedule {
  id: string
  train_number: string
  route: string
  departure: string
  arrival: string
  stations: string
  notes: string
  pdf_file?: string
  created_at: string
}

interface ServerLink {
  id: string
  name: string
  url: string
  created_at: string
}

export default function TrainSchedulesPage() {
  const [schedules, setSchedules] = useState<TrainSchedule[]>([])
  const [serverLinks, setServerLinks] = useState<ServerLink[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isServerDialogOpen, setIsServerDialogOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [databaseStatus, setDatabaseStatus] = useState<"checking" | "ready" | "missing" | "local">("checking")

  const [formData, setFormData] = useState({
    trainNumber: "",
    route: "",
    departure: "",
    arrival: "",
    stations: "",
    notes: "",
    pdfFile: "",
  })

  const [serverFormData, setServerFormData] = useState({
    name: "",
    url: "",
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleteAuthenticated, setIsDeleteAuthenticated] = useState(false)

  const [authError, setAuthError] = useState("")
  const [deleteAuthError, setDeleteAuthError] = useState("")

  const [animatedCards, setAnimatedCards] = useState<Set<string>>(new Set())

  // Check database status and load data
  useEffect(() => {
    checkDatabaseAndLoadData()
  }, [])

  useEffect(() => {
    // Animate cards on load
    const timer = setTimeout(() => {
      const cardIds = new Set(schedules.map((schedule) => schedule.id))
      setAnimatedCards(cardIds)
    }, 100)

    return () => clearTimeout(timer)
  }, [schedules])

  const checkDatabaseAndLoadData = async () => {
    if (!supabase) {
      setDatabaseStatus("local")
      loadLocalData()
      setLoading(false)
      return
    }

    try {
      // Test if tables exist by trying to query them
      const { error: scheduleError } = await supabase.from("train_schedules").select("id").limit(1)

      const { error: serverError } = await supabase.from("server_links").select("id").limit(1)

      if (scheduleError?.code === "PGRST116" || serverError?.code === "PGRST116") {
        // Tables don't exist
        setDatabaseStatus("missing")
        loadLocalData()
      } else if (scheduleError || serverError) {
        // Other database error
        console.error("Database error:", scheduleError || serverError)
        setDatabaseStatus("local")
        loadLocalData()
      } else {
        // Tables exist, load from database
        setDatabaseStatus("ready")
        await loadSchedules()
        await loadServerLinks()
      }
    } catch (error) {
      console.error("Error checking database:", error)
      setDatabaseStatus("local")
      loadLocalData()
    } finally {
      setLoading(false)
    }
  }

  const loadLocalData = () => {
    // Load from localStorage
    const savedSchedules = localStorage.getItem("trainSchedules")
    if (savedSchedules) {
      setSchedules(JSON.parse(savedSchedules))
    }

    const savedServerLinks = localStorage.getItem("serverLinks")
    if (savedServerLinks) {
      setServerLinks(JSON.parse(savedServerLinks))
    }
  }

  const loadSchedules = async () => {
    if (!supabase || databaseStatus !== "ready") return

    try {
      const { data, error } = await supabase
        .from("train_schedules")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSchedules(data || [])
    } catch (error) {
      console.error("Error loading schedules:", error)
    }
  }

  const loadServerLinks = async () => {
    if (!supabase || databaseStatus !== "ready") return

    try {
      const { data, error } = await supabase.from("server_links").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setServerLinks(data || [])
    } catch (error) {
      console.error("Error loading server links:", error)
    }
  }

  const handleAuth = () => {
    if (password === "bombakapitana") {
      setIsAuthenticated(true)
      setPassword("")
      setAuthError("")
    } else {
      setAuthError("Hasło niepoprawne!")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData({ ...formData, pdfFile: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddSchedule = async () => {
    if (!formData.trainNumber || !formData.route || !formData.departure || !formData.arrival) {
      alert("Proszę wypełnić wszystkie wymagane pola!")
      return
    }

    setSubmitting(true)
    try {
      const now = new Date()
      const newSchedule: TrainSchedule = {
        id: Date.now().toString(),
        train_number: formData.trainNumber,
        route: formData.route,
        departure: formData.departure,
        arrival: formData.arrival,
        stations: formData.stations,
        notes: formData.notes,
        pdf_file: formData.pdfFile || undefined,
        created_at: now.toISOString(),
      }

      if (supabase && databaseStatus === "ready") {
        // Use Supabase if available and ready
        const { error } = await supabase.from("train_schedules").insert([
          {
            train_number: formData.trainNumber,
            route: formData.route,
            departure: formData.departure,
            arrival: formData.arrival,
            stations: formData.stations,
            notes: formData.notes,
            pdf_file: formData.pdfFile || null,
          },
        ])

        if (error) throw error
        await loadSchedules()
      } else {
        // Fallback to localStorage
        const updatedSchedules = [newSchedule, ...schedules]
        localStorage.setItem("trainSchedules", JSON.stringify(updatedSchedules))
        setSchedules(updatedSchedules)
      }

      setFormData({
        trainNumber: "",
        route: "",
        departure: "",
        arrival: "",
        stations: "",
        notes: "",
        pdfFile: "",
      })
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error adding schedule:", error)
      alert("Błąd podczas dodawania rozkładu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddServer = async () => {
    if (!serverFormData.name || !serverFormData.url) {
      alert("Proszę wypełnić wszystkie pola!")
      return
    }

    setSubmitting(true)
    try {
      const newServer: ServerLink = {
        id: Date.now().toString(),
        name: serverFormData.name,
        url: serverFormData.url,
        created_at: new Date().toISOString(),
      }

      if (supabase && databaseStatus === "ready") {
        // Use Supabase if available and ready
        const { error } = await supabase.from("server_links").insert([
          {
            name: serverFormData.name,
            url: serverFormData.url,
          },
        ])

        if (error) throw error
        await loadServerLinks()
      } else {
        // Fallback to localStorage
        const updatedServers = [newServer, ...serverLinks]
        localStorage.setItem("serverLinks", JSON.stringify(updatedServers))
        setServerLinks(updatedServers)
      }

      setServerFormData({
        name: "",
        url: "",
      })
      setIsServerDialogOpen(false)
    } catch (error) {
      console.error("Error adding server:", error)
      alert("Błąd podczas dodawania servera!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAuth = () => {
    if (deletePassword === "bombakapitana") {
      setIsDeleteAuthenticated(true)
      setDeletePassword("")
      setDeleteAuthError("")
    } else {
      setDeleteAuthError("Hasło niepoprawne!")
    }
  }

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return

    try {
      if (supabase && databaseStatus === "ready") {
        // Use Supabase if available and ready
        const { error } = await supabase.from("train_schedules").delete().eq("id", scheduleToDelete)

        if (error) throw error
        await loadSchedules()
      } else {
        // Fallback to localStorage
        const updatedSchedules = schedules.filter((schedule) => schedule.id !== scheduleToDelete)
        localStorage.setItem("trainSchedules", JSON.stringify(updatedSchedules))
        setSchedules(updatedSchedules)
      }

      setDeleteDialogOpen(false)
      setScheduleToDelete(null)
      setIsDeleteAuthenticated(false)
      setDeletePassword("")
    } catch (error) {
      console.error("Error deleting schedule:", error)
      alert("Błąd podczas usuwania rozkładu!")
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    try {
      if (supabase && databaseStatus === "ready") {
        // Use Supabase if available and ready
        const { error } = await supabase.from("server_links").delete().eq("id", serverId)

        if (error) throw error
        await loadServerLinks()
      } else {
        // Fallback to localStorage
        const updatedServers = serverLinks.filter((server) => server.id !== serverId)
        localStorage.setItem("serverLinks", JSON.stringify(updatedServers))
        setServerLinks(updatedServers)
      }
    } catch (error) {
      console.error("Error deleting server:", error)
      alert("Błąd podczas usuwania servera!")
    }
  }

  const openDeleteDialog = (scheduleId: string) => {
    setScheduleToDelete(scheduleId)
    setDeleteDialogOpen(true)
    setIsDeleteAuthenticated(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCreationDate = (dateString: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getDatabaseStatusMessage = () => {
    switch (databaseStatus) {
      case "ready":
        return {
          type: "success",
          icon: <Database className="h-5 w-5 text-green-400" />,
          title: "Baza danych połączona",
          message: "Wszyscy użytkownicy widzą te same rozkłady. Dane są synchronizowane w czasie rzeczywistym.",
        }
      case "missing":
        return {
          type: "warning",
          icon: <AlertCircle className="h-5 w-5 text-orange-400" />,
          title: "Baza danych wymaga konfiguracji",
          message:
            "Supabase jest połączone, ale tabele nie zostały utworzone. Uruchom skrypt SQL aby włączyć synchronizację.",
        }
      case "local":
        return {
          type: "info",
          icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
          title: "Tryb lokalny",
          message:
            "Dane są zapisywane tylko w Twojej przeglądarce. Skonfiguruj Supabase aby udostępnić rozkłady innym użytkownikom.",
        }
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Sprawdzanie bazy danych...</p>
        </div>
      </div>
    )
  }

  const statusMessage = getDatabaseStatusMessage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Image Section */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        <Image
          src="/images/train-station-header.jpg"
          alt="Stacja kolejowa Kostrzyn z pociągiem EP07-361"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Train className="h-10 w-10 text-white" />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg">
                Rozkłady Jazdy przez rysiekbomba
              </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto drop-shadow-md">
              Oficjalna strona z rozkładami jazdy pociągów. Wszystkie informacje są aktualizowane regularnie.
            </p>
          </div>
        </div>
      </div>

      {/* Database Status Banner */}
      {statusMessage && (
        <div
          className={`border-l-4 p-4 mx-4 mt-4 ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-400"
              : statusMessage.type === "warning"
                ? "bg-orange-50 border-orange-400"
                : "bg-yellow-50 border-yellow-400"
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">{statusMessage.icon}</div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  statusMessage.type === "success"
                    ? "text-green-800"
                    : statusMessage.type === "warning"
                      ? "text-orange-800"
                      : "text-yellow-800"
                }`}
              >
                {statusMessage.title}
              </p>
              <p
                className={`text-sm mt-1 ${
                  statusMessage.type === "success"
                    ? "text-green-700"
                    : statusMessage.type === "warning"
                      ? "text-orange-700"
                      : "text-yellow-700"
                }`}
              >
                {statusMessage.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex max-w-7xl mx-auto p-4 gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Add Schedule Button */}
          <div className="flex justify-center my-8 animate-fade-in">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Dodaj Nowy Rozkład
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Dodaj Nowy Rozkład Jazdy</DialogTitle>
                  <DialogDescription>Wypełnij formularz aby dodać nowy rozkład jazdy pociągu.</DialogDescription>
                </DialogHeader>

                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <Label htmlFor="password">Kod administratora</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Wprowadź kod administratora"
                      onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                    />
                    {authError && (
                      <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded p-2">
                        {authError}
                      </div>
                    )}
                    <Button onClick={handleAuth} className="w-full">
                      Zaloguj się
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="trainNumber">Numer pociągu *</Label>
                        <Input
                          id="trainNumber"
                          value={formData.trainNumber}
                          onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
                          placeholder="np. IC 5103"
                        />
                      </div>
                      <div>
                        <Label htmlFor="route">Trasa *</Label>
                        <Input
                          id="route"
                          value={formData.route}
                          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                          placeholder="np. Warszawa - Kraków"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="departure">Odjazd *</Label>
                        <Input
                          id="departure"
                          value={formData.departure}
                          onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                          placeholder="np. 08:30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="arrival">Przyjazd *</Label>
                        <Input
                          id="arrival"
                          value={formData.arrival}
                          onChange={(e) => setFormData({ ...formData, arrival: e.target.value })}
                          placeholder="np. 11:45"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="stations">Stacje pośrednie</Label>
                      <Textarea
                        id="stations"
                        value={formData.stations}
                        onChange={(e) => setFormData({ ...formData, stations: e.target.value })}
                        placeholder="np. Radom (09:15), Kielce (10:20), Miechów (11:10)"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Uwagi dodatkowe</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="np. Kursuje codziennie oprócz niedziel"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pdfFile">Rozkład jazdy PDF (opcjonalnie)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="pdfFile"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {formData.pdfFile && (
                          <div className="flex items-center gap-1 text-green-600">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">PDF dodany</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleAddSchedule} className="flex-1" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Dodawanie...
                          </>
                        ) : (
                          "Dodaj Rozkład"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false)
                          setIsAuthenticated(false)
                          setAuthError("")
                        }}
                        disabled={submitting}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Schedules List */}
          <div className="space-y-6">
            {schedules.length === 0 ? (
              <Card className="text-center py-12 animate-fade-in">
                <CardContent>
                  <Train className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Brak rozkładów jazdy</h3>
                  <p className="text-gray-500">
                    Nie dodano jeszcze żadnych rozkładów jazdy. Kliknij przycisk powyżej aby dodać pierwszy.
                  </p>
                </CardContent>
              </Card>
            ) : (
              schedules.map((schedule, index) => (
                <Card
                  key={schedule.id}
                  className={`hover:shadow-lg transition-all duration-500 transform ${
                    animatedCards.has(schedule.id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-blue-700">Pociąg {schedule.train_number}</CardTitle>
                        <CardDescription className="text-lg font-medium text-gray-700 mt-1">
                          {schedule.route}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            Utworzono: {formatCreationDate(schedule.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Dodano: {formatDate(schedule.created_at)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(schedule.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Odjazd:</span>
                          <span className="text-lg font-bold text-green-600">{schedule.departure}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-red-600" />
                          <span className="font-medium">Przyjazd:</span>
                          <span className="text-lg font-bold text-red-600">{schedule.arrival}</span>
                        </div>
                      </div>

                      {schedule.stations && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Stacje pośrednie:</span>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{schedule.stations}</p>
                        </div>
                      )}
                    </div>

                    {schedule.notes && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <span className="font-medium text-gray-700">Uwagi: </span>
                          <span className="text-gray-600">{schedule.notes}</span>
                        </div>
                      </>
                    )}

                    {schedule.pdf_file && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-700">Rozkład PDF: </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = schedule.pdf_file!
                              link.download = `rozkład-${schedule.train_number}.pdf`
                              link.click()
                            }}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Pobierz
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-500">© 2025 Rozkłady Jazdy przez rysiekbomba. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Server Links Section */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Przydzielone składy do servera
              </CardTitle>
              <CardDescription>Linki do serverów Roblox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated && (
                <Dialog open={isServerDialogOpen} onOpenChange={setIsServerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Dodaj Server
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dodaj Link do Servera</DialogTitle>
                      <DialogDescription>Dodaj nowy server Roblox</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serverName">Nazwa servera</Label>
                        <Input
                          id="serverName"
                          value={serverFormData.name}
                          onChange={(e) => setServerFormData({ ...serverFormData, name: e.target.value })}
                          placeholder="np. Server Główny"
                        />
                      </div>
                      <div>
                        <Label htmlFor="serverUrl">Link do servera</Label>
                        <Input
                          id="serverUrl"
                          value={serverFormData.url}
                          onChange={(e) => setServerFormData({ ...serverFormData, url: e.target.value })}
                          placeholder="https://www.roblox.com/games/..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddServer} className="flex-1" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Dodawanie...
                            </>
                          ) : (
                            "Dodaj"
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setIsServerDialogOpen(false)} disabled={submitting}>
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <div className="space-y-2">
                {serverLinks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Brak dodanych serverów</p>
                ) : (
                  serverLinks.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{server.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(server.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(server.url, "_blank")}
                          className="p-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteServer(server.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roblox Link */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Profil gracza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => window.open("https://www.roblox.com/pl/users/818949423/profile", "_blank")}
              >
                <Image src="/images/roblox-icon.webp" alt="Roblox" width={20} height={20} className="mr-2" />
                Rysiekbomba - Roblox
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Delete Schedule Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usuń Rozkład Jazdy</DialogTitle>
              <DialogDescription>
                Czy na pewno chcesz usunąć ten rozkład? Ta operacja jest nieodwracalna.
              </DialogDescription>
            </DialogHeader>

            {!isDeleteAuthenticated ? (
              <div className="space-y-4">
                <Label htmlFor="deletePassword">Kod administratora</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Wprowadź kod administratora"
                  onKeyPress={(e) => e.key === "Enter" && handleDeleteAuth()}
                />
                {deleteAuthError && (
                  <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded p-2">
                    {deleteAuthError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleDeleteAuth} variant="destructive" className="flex-1">
                    Potwierdź
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setScheduleToDelete(null)
                      setDeletePassword("")
                      setDeleteAuthError("")
                    }}
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Uwaga! Usunięcie rozkładu jest nieodwracalne.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDeleteSchedule} variant="destructive" className="flex-1">
                    Usuń Rozkład
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setScheduleToDelete(null)
                      setIsDeleteAuthenticated(false)
                      setDeletePassword("")
                      setDeleteAuthError("")
                    }}
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
