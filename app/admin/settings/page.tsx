"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Building2, Upload, Globe, Mail, Phone, MapPin, Facebook, Linkedin, Twitter, Instagram } from "lucide-react"

interface OrganizationSettings {
  id: string
  name: string
  logo: string | null
  website: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  description: string | null
  socialLinks: {
    facebook?: string
    linkedin?: string
    twitter?: string
    instagram?: string
  } | null
  locations?: { city: string; country: string }[] | null
}

export default function AdminSettingsPage() {

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)

  // Organization Form States
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [address, setAddress] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    linkedin: "",
    twitter: "",
    instagram: ""
  })


  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrganizationSettings()
  }, [])

  const fetchOrganizationSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/organization")
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setOrgSettings(data)
          setName(data.name || "")
          setDescription(data.description || "")
          setWebsite(data.website || "")
          setContactEmail(data.contactEmail || "")
          setContactPhone(data.contactPhone || "")
          setAddress(data.address || "")
          setLogoPreview(data.logo || null)
          if (data.socialLinks) {
            setSocialLinks({
              facebook: data.socialLinks.facebook || "",
              linkedin: data.socialLinks.linkedin || "",
              twitter: data.socialLinks.twitter || "",
              instagram: data.socialLinks.instagram || ""
            })
          }

        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }



  const handleSaveOrganization = async () => {
    try {
      setSaving(true)
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("website", website)
      formData.append("contactEmail", contactEmail)
      formData.append("contactPhone", contactPhone)
      formData.append("address", address)
      formData.append("socialLinks", JSON.stringify(socialLinks))

      if (logoFile) {
        formData.append("logo", logoFile)
      }

      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setOrgSettings(data.settings)
        alert("Organization settings saved successfully!")
      } else {
        alert("Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Error saving settings")
    } finally {
      setSaving(false)
    }
  }



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-2">
          Manage your organization profile and branding
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="border-t-4 border-t-blue-600 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <CardTitle>Organization Profile</CardTitle>
            </div>
            <CardDescription>
              Update your company details, branding, and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Logo Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start p-6 bg-gray-50 rounded-xl border border-gray-100">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white overflow-hidden relative group cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Change Logo</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-gray-500 max-w-[200px]">
                  Recommended size: 512x512px. JPG, PNG or SVG allowed.
                </p>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-desc">Description</Label>
                  <Textarea
                    id="org-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description about your company..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2 border-b pb-2">
                  <Mail className="h-4 w-4 text-gray-500" /> Contact Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      className="pl-9"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      className="pl-9"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      className="pl-9"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      className="pl-9"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Business St, City, Country"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2 border-b pb-2">
                  <Globe className="h-4 w-4 text-gray-500" /> Social Media
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
                    <Input
                      id="facebook"
                      className="pl-9"
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                      placeholder="Facebook URL"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-blue-700" />
                    <Input
                      id="linkedin"
                      className="pl-9"
                      value={socialLinks.linkedin}
                      onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                      placeholder="LinkedIn URL"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                    <Input
                      id="twitter"
                      className="pl-9"
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="Twitter URL"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-pink-600" />
                    <Input
                      id="instagram"
                      className="pl-9"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      placeholder="Instagram URL"
                    />
                  </div>
                </div>
              </div>


            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveOrganization}
                disabled={saving}
                className="min-w-[150px]"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
