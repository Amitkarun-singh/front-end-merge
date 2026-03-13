import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  School,
  GraduationCap,
  ChevronRight,
  Shield,
  FileText,
  Flame,
  Target,
  Languages,
  MapPin,
  Hash,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileData {
  school_name: string | null;
  board: string | null;
  address: string | null;
  class: string | null;
  div: string | null;
  roll_number: string | null;
  Student_name: string | null;
  number: string | null;
  email: string | null;
  gender: string | null;
  dob: string | null;
  language: string | null;
  joining_date: string | null;
  role: string | null;
}

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const API_BASE =
          import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "Failed to fetch profile");
        }

        setProfile(json.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch profile";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Calculate profile completion
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.Student_name,
      profile.email,
      profile.number,
      profile.school_name,
      profile.board,
      profile.class,
      profile.div,
      profile.roll_number,
      profile.gender,
      profile.dob,
      profile.language,
      profile.address,
    ];
    const filled = fields.filter(
      (f) => f !== null && f !== undefined && f !== ""
    ).length;
    return Math.round((filled / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();
  const initials = profile?.Student_name
    ? profile.Student_name.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="edtech-card text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <User className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Failed to load profile
          </h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Profile
          </h1>
        </div>

        {/* Profile Completion Banner */}
        <div className="edtech-card mb-6 gradient-hero">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center font-bold text-primary text-lg">
                {profileCompletion}%
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {profileCompletion >= 100
                    ? "Profile complete!"
                    : "Complete your profile"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {profileCompletion >= 100
                    ? "All details are filled in."
                    : "Fill in your details to get the best experience"}
                </p>
              </div>
            </div>
            <Progress value={profileCompletion} className="w-32 h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info */}
          <div className="space-y-6">
            {/* Avatar & Name */}
            <div className="edtech-card text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {initials}
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {profile?.Student_name || "Student"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profile?.role || "STUDENT"}
              </p>
              {profile?.joining_date && (
                <p className="text-sm text-muted-foreground">
                  Joined {formatDate(profile.joining_date)}
                </p>
              )}

              <div className="mt-4 p-3 rounded-lg bg-accent/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {profileCompletion >= 100
                      ? "Profile complete"
                      : "Complete your profile"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <Progress
                  value={profileCompletion}
                  className="h-1.5 mt-2"
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold text-foreground">0%</p>
                  <p className="text-xs text-muted-foreground">
                    Test Overall%
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold text-foreground">1 Day</p>
                  <p className="text-xs text-muted-foreground">Login Days</p>
                </div>
              </div>
            </div>

            {/* Week's Activity */}
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">
                Week's Activity
              </h3>
              <div className="flex justify-center gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                      i === new Date().getDay()
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Overall: 1 day active
              </p>
            </div>
          </div>

          {/* Right Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-6">
                Account Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Personal Details
                  </h4>

                  <InfoField
                    icon={<User className="w-4 h-4" />}
                    label="Full Name"
                    value={profile?.Student_name}
                  />

                  <InfoField
                    icon={<Phone className="w-4 h-4" />}
                    label="Mobile"
                    value={
                      profile?.number ? `+91 ${profile.number}` : null
                    }
                  />

                  <InfoField
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={profile?.email}
                  />

                  <InfoField
                    icon={<Calendar className="w-4 h-4" />}
                    label="Date of Birth"
                    value={formatDate(profile?.dob ?? null)}
                    placeholder="Not provided"
                  />

                  <InfoField
                    icon={<User className="w-4 h-4" />}
                    label="Gender"
                    value={profile?.gender}
                    placeholder="Not provided"
                  />

                  <InfoField
                    icon={<Languages className="w-4 h-4" />}
                    label="Preferred Language"
                    value={profile?.language}
                    placeholder="Not set"
                  />
                </div>

                {/* School/College Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    School Details
                  </h4>

                  <InfoField
                    icon={<School className="w-4 h-4" />}
                    label="School Name"
                    value={profile?.school_name}
                  />

                  <InfoField
                    icon={<BookOpen className="w-4 h-4" />}
                    label="Board"
                    value={profile?.board}
                  />

                  <InfoField
                    icon={<GraduationCap className="w-4 h-4" />}
                    label="Class"
                    value={profile?.class}
                  />

                  <InfoField
                    icon={<Hash className="w-4 h-4" />}
                    label="Section"
                    value={profile?.div}
                  />

                  <InfoField
                    icon={<Hash className="w-4 h-4" />}
                    label="Roll Number"
                    value={profile?.roll_number}
                  />

                  <InfoField
                    icon={<MapPin className="w-4 h-4" />}
                    label="Address"
                    value={profile?.address}
                  />
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <a
                href="#"
                className="hover:text-primary flex items-center gap-1"
              >
                <Shield className="w-4 h-4" />
                Privacy Policy
              </a>
              <span>•</span>
              <a
                href="#"
                className="hover:text-primary flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                Terms & Conditions
              </a>
              <span>•</span>
              <span>Version 9.8.8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Reusable info field component ---- */
function InfoField({
  icon,
  label,
  value,
  placeholder = "Not provided",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm font-medium truncate ${
            hasValue ? "text-foreground" : "text-muted-foreground/50 italic"
          }`}
        >
          {hasValue ? value : placeholder}
        </p>
      </div>
    </div>
  );
}