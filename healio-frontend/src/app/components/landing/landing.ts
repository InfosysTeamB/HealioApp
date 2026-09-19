import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocationModalComponent } from '../../shared/location-modal/location-modal';
import { AidocModalComponent } from '../../shared/aidoc-modal/aidoc-modal';
import { InpersonConsultCardComponent } from '../../shared/inperson-consult-card/inperson-consult-card';
import { DoctorStreamService, ClinicDoctor } from '../../services/doctor-stream.service';
import { AuthService, UserSession } from '../../services/auth.service';

export interface Speciality {
  name: string;
  image: string;
  category: 'general' | 'advanced';
}

export interface RecentlyViewedItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'doctor' | 'specialty' | 'clinic' | 'search';
  query?: string;
  doctorId?: string;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  type: 'doctor' | 'specialty' | 'symptom' | 'clinic';
  icon: string;
  badge: string;
  query: string;
  doctorId?: string;
}

export interface VideoDoctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  rating: number;
  consultsCount: number;
  videoFee: number;
  languages: string[];
  avatarUrl: string;
  isOnline: boolean;
  waitDuration: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LocationModalComponent,
    AidocModalComponent,
    InpersonConsultCardComponent
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent implements OnInit {
  private doctorStream = inject(DoctorStreamService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Profile modal state for doctor details
  selectedDoctorProfile = signal<ClinicDoctor | null>(null);

  // Verified User auth and profile drawer state
  readonly currentUser = this.authService.currentUser;
  isProfileDrawerOpen = signal<boolean>(false);

  // User initials computed from currentUser
  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user || !user.name) return 'PT';
    return user.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  // User location and active navigation state
  selectedCity = signal<string>('Bangalore');
  userCoordinates = signal<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  isLocationModalOpen = signal<boolean>(false);
  isAiDocModalOpen = signal<boolean>(false);
  activeCareTab = signal<'general' | 'advanced'>('general');
  activeNav = signal<'home' | 'in-person' | 'video' | 'account'>('home');

  // Fast Keyword Search with 250ms debounce and autocomplete
  searchQuery = signal<string>('');
  debouncedSearchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);
  private debounceTimer?: any;

  // Reactive Recently Viewed Signal (capped at 4, deduplicated)
  recentlyViewed = signal<RecentlyViewedItem[]>([]);

  // Autocomplete Suggestions Dropdown
  showAutocompleteDropdown = computed<boolean>(() => {
    return (
      this.isSearchFocused() &&
      this.searchQuery().trim().length >= 1 &&
      this.searchSuggestions().length > 0
    );
  });

  searchSuggestions = computed<SearchSuggestion[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];

    const suggestions: SearchSuggestion[] = [];

    // 1. Specialties matching query
    for (const spec of this.specialities()) {
      if (spec.name.toLowerCase().includes(q)) {
        suggestions.push({
          id: 'sugg-spec-' + spec.name.toLowerCase().replace(/\s+/g, '-'),
          title: spec.name,
          subtitle: `${spec.category === 'general' ? 'General Care' : 'Advanced Care'} Specialty`,
          type: 'specialty',
          icon: '🩺',
          badge: 'Specialty',
          query: spec.name
        });
      }
    }

    // 2. Doctors matching name, specialty, clinic, symptoms
    for (const doc of this.inPersonDoctors()) {
      const matchName = doc.name.toLowerCase().includes(q);
      const matchSpecialty = doc.specialty.toLowerCase().includes(q);
      const matchClinic = doc.clinicName.toLowerCase().includes(q);
      const matchSymptom = doc.symptoms.some(s => s.toLowerCase().includes(q));

      if (matchName || matchSpecialty || matchClinic || matchSymptom) {
        suggestions.push({
          id: 'sugg-doc-' + doc.id,
          title: doc.name,
          subtitle: `${doc.specialty} • ${doc.clinicName} (${doc.distanceKm} km)`,
          type: 'doctor',
          icon: '👨‍⚕️',
          badge: 'Doctor',
          query: doc.name,
          doctorId: doc.id
        });
      }
    }

    // 3. Common symptoms
    const commonSymptoms = [
      { name: 'Fever & Cold', specialty: 'General Physician' },
      { name: 'Headache & Migraine', specialty: 'General Physician' },
      { name: 'Skin Rash & Acne', specialty: 'Dermatologist' },
      { name: 'Chest Pain & Heart', specialty: 'Cardiologist' },
      { name: 'Joint & Back Pain', specialty: 'Orthopedic Surgeon' },
      { name: 'Child Fever & Cough', specialty: 'Pediatrician' },
      { name: 'Pregnancy & Cramps', specialty: 'Gynecologist' }
    ];

    for (const sym of commonSymptoms) {
      if (
        sym.name.toLowerCase().includes(q) &&
        !suggestions.some(s => s.title.toLowerCase().includes(sym.specialty.toLowerCase()))
      ) {
        suggestions.push({
          id: 'sugg-sym-' + sym.name.toLowerCase().replace(/\s+/g, '-'),
          title: sym.name,
          subtitle: `Consult a ${sym.specialty}`,
          type: 'symptom',
          icon: '💡',
          badge: 'Symptom',
          query: sym.specialty
        });
      }
    }

    return suggestions.slice(0, 6);
  });

  // Reactive Filter Pills
  filterAvailableToday = signal<boolean>(false);
  filterWithin5Km = signal<boolean>(false);
  filterHighRating = signal<boolean>(false);
  activeSpecialtyFilter = signal<string | null>(null);

  // Raw Doctors Signal from Live Stream
  readonly inPersonDoctors = this.doctorStream.doctors;

  // Reactive Computed Filtered & Sorted Doctors List
  filteredDoctors = computed<ClinicDoctor[]>(() => {
    const list = this.inPersonDoctors();
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    const specialtyFilter = this.activeSpecialtyFilter()?.toLowerCase();
    const onlyToday = this.filterAvailableToday();
    const onlyWithin5Km = this.filterWithin5Km();
    const onlyHighRating = this.filterHighRating();

    return list
      .filter(doc => {
        // 1. Keyword search across doctor name, specialty, clinic, address, and symptoms
        if (query) {
          const matchName = doc.name.toLowerCase().includes(query);
          const matchSpecialty = doc.specialty.toLowerCase().includes(query);
          const matchClinic = doc.clinicName.toLowerCase().includes(query);
          const matchAddress = doc.clinicAddress.toLowerCase().includes(query);
          const matchSymptom = doc.symptoms.some(s => s.toLowerCase().includes(query));

          if (!matchName && !matchSpecialty && !matchClinic && !matchAddress && !matchSymptom) {
            return false;
          }
        }

        // 2. Active specialty filter (e.g. from AIDoc handoff or chip)
        if (specialtyFilter && doc.specialty.toLowerCase() !== specialtyFilter) {
          return false;
        }

        // 3. Available Today filter
        if (onlyToday) {
          const isTodaySlot =
            doc.nextAvailableSlot.toLowerCase().includes('today') ||
            doc.availableSlots.some(s => s.toLowerCase().includes('pm') || s.toLowerCase().includes('am'));
          if (!isTodaySlot || doc.availableSlots.length === 0) {
            return false;
          }
        }

        // 4. Within 5 km filter
        if (onlyWithin5Km && doc.distanceKm > 5.0) {
          return false;
        }

        // 5. High Rating (4.5+) filter
        if (onlyHighRating && doc.rating < 4.5) {
          return false;
        }

        return true;
      })
      // Sort by closest proximity (distanceKm ascending)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  });

  specialities = signal<Speciality[]>([
    // --- General Care ---
    {
      name: 'General Physician',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      category: 'general'
    },
    {
      name: 'Gynecologist',
      image: 'https://th.bing.com/th?q=Gynecologist+Logo+Hart+Clip+Art+PNG&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-IN&cc=IN&setlang=en&adlt=moderate&t=1&mw=247',
      category: 'general'
    },
    {
      name: 'Dermatologist',
      image: 'https://th.bing.com/th/id/OIP.2UgmiQcrxs9Jkwll7nlwogHaG8?w=177&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },
    {
      name: 'Pediatrician',
      image: 'https://th.bing.com/th/id/OIP.ZliGDoVjHGGJr9xUF35knQHaHa?w=225&h=220&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },
    {
      name: 'Dentist',
      image: 'https://th.bing.com/th/id/OIP.O1jd8rWudw-u5aXzO7-oUgHaHa?w=183&h=183&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },
    {
      name: 'ENT Specialist',
      image: 'https://th.bing.com/th/id/OIP.ZXcm7_CnXC4w1_uIn5BJEgHaHH?w=219&h=210&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },
    {
      name: 'Eye Specialist',
      image: 'https://th.bing.com/th/id/OIP.9kGN5fzb7gYxoGNLdxjcygAAAA?w=207&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },
    {
      name: 'Mental Wellness',
      image: 'https://th.bing.com/th/id/OIP.YppLxfpbGEMIuVySEbseqgHaHa?w=188&h=188&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'general'
    },

    // --- Advanced Care ---
    {
      name: 'Cardiologist',
      image: 'https://th.bing.com/th/id/OIP.JBVzgf3n5uHHI2Qrx7jcWAHaHa?w=190&h=190&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'advanced'
    },
    {
      name: 'Orthopedic Surgeon',
      image: 'https://th.bing.com/th/id/OIP.mnb-O6K-tnNWz-6zMcE9nQHaHa?w=178&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'advanced'
    },
    {
      name: 'Neurologist',
      image: 'https://th.bing.com/th/id/OIP.slFUF7fWtTKoALVgVNP-XgHaHa?w=156&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'advanced'
    },
    {
      name: 'Nephrologist',
      image: 'https://th.bing.com/th/id/OIP.y9kO8glbqsK6fYOXGfy-4wHaHa?w=211&h=211&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'advanced'
    },
    {
      name: 'Oncologist',
      image: 'https://th.bing.com/th/id/OIP.uDRn5UbbZHTCJHAoBi-TMgHaHa?w=174&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
      category: 'advanced'
    },
    {
      name: 'Pulmonologist',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaI7EgOA7wy-N2JOl_VmS0vk1dh_fBrtQt8W3gSLF4Yw&s=10',
      category: 'advanced'
    }
  ]);

  // Online Instant Connect Ready Doctors (< 60s connect)
  onlineVideoDoctors = signal<VideoDoctor[]>([
    {
      id: 'vdoc-1',
      name: 'Dr. Ananya Sen',
      specialty: 'General Physician',
      qualification: 'MBBS, MD (Internal Medicine)',
      experienceYears: 9,
      rating: 4.92,
      consultsCount: 1450,
      videoFee: 399,
      languages: ['English', 'Hindi', 'Bengali'],
      avatarUrl: 'https://images.unsplash.com/photo-1594824813571-638f0263613a?w=300&auto=format&fit=crop&q=80',
      isOnline: true,
      waitDuration: '< 45s'
    },
    {
      id: 'vdoc-2',
      name: 'Dr. Vikramaditya Rao',
      specialty: 'Cardiologist',
      qualification: 'MD, DM (Cardiology), FACC',
      experienceYears: 14,
      rating: 4.96,
      consultsCount: 980,
      videoFee: 599,
      languages: ['English', 'Telugu', 'Hindi'],
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      isOnline: true,
      waitDuration: '< 60s'
    },
    {
      id: 'vdoc-3',
      name: 'Dr. Shalini Nair',
      specialty: 'Dermatologist',
      qualification: 'MBBS, DVD, DNB (Dermatology)',
      experienceYears: 10,
      rating: 4.9,
      consultsCount: 2120,
      videoFee: 499,
      languages: ['English', 'Malayalam', 'Hindi'],
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
      isOnline: true,
      waitDuration: '< 30s'
    },
    {
      id: 'vdoc-4',
      name: 'Dr. Rohit Kulkarni',
      specialty: 'Pediatrician',
      qualification: 'MBBS, MD (Pediatrics), DCH',
      experienceYears: 12,
      rating: 4.88,
      consultsCount: 1840,
      videoFee: 449,
      languages: ['English', 'Kannada', 'Hindi'],
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      isOnline: true,
      waitDuration: '< 50s'
    }
  ]);

  ngOnInit() {
    this.loadRecentlyViewed();

    const saved = localStorage.getItem('healio_selected_city');
    const savedLat = localStorage.getItem('healio_selected_lat');
    const savedLng = localStorage.getItem('healio_selected_lng');

    if (saved && savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      this.selectedCity.set(saved);
      this.userCoordinates.set({ lat, lng });
      this.doctorStream.recalculateDistances(lat, lng);
    } else if (saved) {
      this.selectedCity.set(saved);
    } else {
      this.autoDetectLocation();
    }
  }

  // --- Dynamic Recently Viewed Storage & Capping ---
  private loadRecentlyViewed() {
    const raw = localStorage.getItem('healio_recent_views');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.recentlyViewed.set(parsed.slice(0, 4));
          return;
        }
      } catch (e) {
        console.warn('[Landing] Error parsing healio_recent_views:', e);
      }
    }
    // Seed initial clean recents
    const defaults: RecentlyViewedItem[] = [
      {
        id: 'spec-dermatologist',
        title: 'Dermatologist',
        subtitle: 'Specialty',
        type: 'specialty',
        query: 'Dermatologist'
      },
      {
        id: 'spec-general-physician',
        title: 'General Physician',
        subtitle: 'Specialty',
        type: 'specialty',
        query: 'General Physician'
      }
    ];
    this.recentlyViewed.set(defaults);
  }

  addToRecentlyViewed(item: RecentlyViewedItem) {
    this.recentlyViewed.update(current => {
      const filtered = current.filter(
        i => i.id !== item.id && i.title.toLowerCase() !== item.title.toLowerCase()
      );
      const updated = [item, ...filtered].slice(0, 4);
      localStorage.setItem('healio_recent_views', JSON.stringify(updated));
      return updated;
    });
  }

  clearRecentlyViewed(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.recentlyViewed.set([]);
    localStorage.removeItem('healio_recent_views');
  }

  onRecentItemClick(item: RecentlyViewedItem) {
    if (item.type === 'doctor' && item.doctorId) {
      const doc = this.inPersonDoctors().find(d => d.id === item.doctorId);
      if (doc) {
        this.selectedDoctorProfile.set(doc);
      }
      this.searchQuery.set(item.title);
      this.debouncedSearchQuery.set(item.title);
      this.scrollToDoctors();
    } else if (item.type === 'specialty') {
      this.activeSpecialtyFilter.set(item.title);
      this.searchQuery.set(item.title);
      this.debouncedSearchQuery.set(item.title);
      this.scrollToDoctors();
    } else {
      const q = item.query || item.title;
      this.searchQuery.set(q);
      this.debouncedSearchQuery.set(q);
      this.scrollToDoctors();
    }
  }

  selectSuggestion(item: SearchSuggestion) {
    this.searchQuery.set(item.title);
    this.debouncedSearchQuery.set(item.query || item.title);
    this.isSearchFocused.set(false);

    if (item.type === 'specialty') {
      this.activeSpecialtyFilter.set(item.title);
    } else if (item.type === 'doctor' && item.doctorId) {
      const doc = this.inPersonDoctors().find(d => d.id === item.doctorId);
      if (doc) {
        this.selectedDoctorProfile.set(doc);
      }
    }

    this.addToRecentlyViewed({
      id: item.id.replace('sugg-', ''),
      title: item.title,
      subtitle: item.subtitle,
      type: item.type === 'symptom' ? 'search' : item.type,
      query: item.query || item.title,
      doctorId: item.doctorId
    });

    this.scrollToDoctors();
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused.set(false);
    }, 200);
  }

  scrollToDoctors() {
    setTimeout(() => {
      const el = document.querySelector('.inperson-section') || document.getElementById('inperson-consultations');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // --- Granular Reverse Geocoding & High-Accuracy Geolocation ---
  formatGranularLocation(a: any): string {
    if (!a) return 'Bangalore';
    // Priority hierarchy: suburb > neighbourhood > town > village
    const locality =
      a.suburb ||
      a.neighbourhood ||
      a.town ||
      a.village ||
      a.quarter ||
      a.residential ||
      a.hamlet ||
      a.city_district ||
      a.subdistrict ||
      a.borough ||
      '';

    let district = '';
    if (locality && a.city && a.city.toLowerCase() !== locality.toLowerCase()) {
      district = a.city;
    } else {
      district =
        a.state_district ||
        a.county ||
        a.district ||
        a.state ||
        '';
    }

    if (
      locality &&
      district &&
      locality.toLowerCase() !== district.toLowerCase() &&
      !district.toLowerCase().includes(locality.toLowerCase()) &&
      !locality.toLowerCase().includes(district.toLowerCase())
    ) {
      return `${locality}, ${district}`;
    } else if (locality) {
      return locality;
    } else if (district) {
      return district;
    } else if (a.city) {
      return a.city;
    }
    return 'Bangalore';
  }

  detectGPSLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.openLocationModal();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.userCoordinates.set({ lat, lng });
        localStorage.setItem('healio_selected_lat', lat.toString());
        localStorage.setItem('healio_selected_lng', lng.toString());

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            const label = this.formatGranularLocation(data.address);
            this.selectedCity.set(label);
            localStorage.setItem('healio_selected_city', label);
          }
        } catch (e) {
          console.warn('[Landing] Reverse geocoding failed:', e);
        }

        this.doctorStream.recalculateDistances(lat, lng);
      },
      (err) => {
        console.warn('[Landing] GPS error, falling back to modal:', err);
        this.openLocationModal();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  private autoDetectLocation() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.userCoordinates.set({ lat, lng });
          localStorage.setItem('healio_selected_lat', lat.toString());
          localStorage.setItem('healio_selected_lng', lng.toString());

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.address) {
              const label = this.formatGranularLocation(data.address);
              this.selectedCity.set(label);
              localStorage.setItem('healio_selected_city', label);
            }
          } catch (e) {
            console.warn('[Landing] Auto reverse geocoding error:', e);
          }

          this.doctorStream.recalculateDistances(lat, lng);
        },
        () => {
          // Defaults to Bangalore coordinates if location permission denied
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }

  // --- Dynamic Dual-Search Workflow ---
  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debouncedSearchQuery.set(val);
      if (val.trim().length >= 3) {
        this.addToRecentlyViewed({
          id: 'search-' + val.trim().toLowerCase().replace(/\s+/g, '-'),
          title: val.trim(),
          subtitle: 'Search Query',
          type: 'search',
          query: val.trim()
        });
      }
    }, 250);
  }

  onSearchEnter() {
    const q = this.searchQuery().trim();
    if (q) {
      this.debouncedSearchQuery.set(q);
      this.addToRecentlyViewed({
        id: 'search-' + q.toLowerCase().replace(/\s+/g, '-'),
        title: q,
        subtitle: 'Search Query',
        type: 'search',
        query: q
      });
      this.scrollToDoctors();
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.debouncedSearchQuery.set('');
  }

  openLocationModal() {
    this.isLocationModalOpen.set(true);
  }

  onLocationConfirmed(loc: { city: string; address: string; lat: number; lng: number }) {
    this.selectedCity.set(loc.city);
    localStorage.setItem('healio_selected_city', loc.city);
    localStorage.setItem('healio_selected_lat', loc.lat.toString());
    localStorage.setItem('healio_selected_lng', loc.lng.toString());
    this.userCoordinates.set({ lat: loc.lat, lng: loc.lng });

    // Live Proximity Recalculation: Haversine distance update & reorder
    this.doctorStream.recalculateDistances(loc.lat, loc.lng);
    this.isLocationModalOpen.set(false);
  }

  // --- Quick Reactive Filter Pills ---
  toggleAvailableToday() {
    this.filterAvailableToday.update(v => !v);
  }

  toggleWithin5Km() {
    this.filterWithin5Km.update(v => !v);
  }

  toggleHighRating() {
    this.filterHighRating.update(v => !v);
  }

  clearSpecialtyFilter() {
    this.activeSpecialtyFilter.set(null);
  }

  resetAllFilters() {
    this.clearSearch();
    this.filterAvailableToday.set(false);
    this.filterWithin5Km.set(false);
    this.filterHighRating.set(false);
    this.activeSpecialtyFilter.set(null);
  }

  // --- AIDoc Clinical Triage Handoff ---
  handleAiDocSpecialtyHandoff(specialty: string) {
    this.isAiDocModalOpen.set(false);
    this.activeSpecialtyFilter.set(specialty);
    this.searchQuery.set(specialty);
    this.debouncedSearchQuery.set(specialty);

    this.addToRecentlyViewed({
      id: 'spec-' + specialty.toLowerCase().replace(/\s+/g, '-'),
      title: specialty,
      subtitle: 'Specialty',
      type: 'specialty',
      query: specialty
    });

    this.scrollToDoctors();
  }

  // --- Live Instant Slot Booking ---
  handleSlotBooking(event: { doctorId: string; slot: string }) {
    const res = this.doctorStream.bookSlotOptimistic(event.doctorId, event.slot);
    if (res.success && res.doctor) {
      console.log(`[Healio Booking] Locked slot ${event.slot} with ${res.doctor.name}`);
      this.addToRecentlyViewed({
        id: 'doc-' + res.doctor.id,
        title: res.doctor.name,
        subtitle: `${res.doctor.specialty} • Slot ${event.slot}`,
        type: 'doctor',
        doctorId: res.doctor.id,
        query: res.doctor.name
      });
    }
  }

  handleProfileClick(doctorId: string) {
    const doc = this.inPersonDoctors().find(d => d.id === doctorId);
    if (doc) {
      this.selectedDoctorProfile.set(doc);
      this.addToRecentlyViewed({
        id: 'doc-' + doc.id,
        title: doc.name,
        subtitle: `${doc.specialty} • ${doc.distanceKm} km`,
        type: 'doctor',
        doctorId: doc.id,
        query: doc.name
      });
    }
  }

  closeProfileModal() {
    this.selectedDoctorProfile.set(null);
  }

  // --- Dynamic Profile Drawer Controls ---
  toggleProfileDrawer() {
    this.isProfileDrawerOpen.update(v => !v);
  }

  closeProfileDrawer() {
    this.isProfileDrawerOpen.set(false);
  }

  logoutPatient() {
    this.closeProfileDrawer();
    this.authService.logout(true);
  }

  goToPortal(routePath: string, tab?: string) {
    this.closeProfileDrawer();
    if (tab) {
      this.router.navigate([routePath], { queryParams: { tab } });
    } else {
      this.router.navigate([routePath]);
    }
  }

  goToDoctorWorkspace() {
    this.closeProfileDrawer();
    this.authService.loginDemoDoctor();
    this.router.navigate(['/doctor']);
  }

  // --- Interactive Service Modals & Quick-Action States ---
  activeServiceModal = signal<'lab' | 'surgery' | 'medicine' | null>(null);
  isAppointmentDetailsModalOpen = signal<boolean>(false);
  serviceActionSuccess = signal<string | null>(null);

  // Lab Test Packages
  readonly labPackages = [
    {
      id: 'lab-1',
      title: 'Comprehensive Gold Full Body Checkup',
      testsCount: '64 Tests Included',
      description: 'Hemogram, Lipid Profile, Liver & Kidney Function, Thyroid (T3/T4/TSH), HbA1c, Vitamin D3 & B12',
      originalPrice: 2999,
      discountedPrice: 1499,
      badge: '50% OFF • Most Popular',
      fastingReq: '10-12 hours fasting required'
    },
    {
      id: 'lab-2',
      title: 'Cardiac & Lipid Risk Screen',
      testsCount: '12 Tests Included',
      description: 'Total Cholesterol, HDL, LDL, Triglycerides, hs-CRP, Apolipoprotein-A1/B, Cardiac risk ratio',
      originalPrice: 1200,
      discountedPrice: 650,
      badge: 'Heart Care Essential',
      fastingReq: '8 hours fasting required'
    },
    {
      id: 'lab-3',
      title: 'Complete Blood Count (CBC) with ESR',
      testsCount: '18 Parameters',
      description: 'Hemoglobin, RBC, Platelet count, Total & Differential WBC, Hematocrit, Infection index',
      originalPrice: 450,
      discountedPrice: 299,
      badge: 'Express 6hr Report',
      fastingReq: 'No fasting required'
    },
    {
      id: 'lab-4',
      title: 'Diabetes & Glycemic Monitor',
      testsCount: '4 Tests Included',
      description: 'HbA1c Glycated Hemoglobin, Fasting Blood Glucose, Estimated Average Glucose (eAG), Urine Microalbumin',
      originalPrice: 750,
      discountedPrice: 399,
      badge: 'NABL Certified',
      fastingReq: 'Fasting + PP required'
    }
  ];

  // Surgery Inquiry Options
  readonly surgicalProcedures = [
    {
      id: 'surg-1',
      name: 'Cataract Eye Surgery (Phaco + Foldable IOL)',
      department: 'Ophthalmology',
      stay: 'Day Care (Walk home in 2h)',
      insurance: '100% Cashless Available',
      leadTime: 'Next Day Slot'
    },
    {
      id: 'surg-2',
      name: 'Laparoscopic Gallbladder (Cholecystectomy)',
      department: 'Minimally Invasive General Surgery',
      stay: '1 Day Hospitalization',
      insurance: 'All Major TPAs Accepted',
      leadTime: '2 Days Slot'
    },
    {
      id: 'surg-3',
      name: 'Laparoscopic Hernia Repair (Mesh Plasty)',
      department: 'Advanced Laparoscopy',
      stay: '1 Day Hospitalization',
      insurance: '0% EMI Option',
      leadTime: 'Flexible Scheduling'
    },
    {
      id: 'surg-4',
      name: 'Total Knee Replacement (Robotic Assisted)',
      department: 'Orthopedics & Joint Care',
      stay: '2-3 Days Hospitalization',
      insurance: 'Pre-auth In 30 Mins',
      leadTime: 'Consultation First'
    },
    {
      id: 'surg-5',
      name: 'Custom Contoura LASIK Eye Correction',
      department: 'Laser Refractive Surgery',
      stay: '15 Mins Procedure',
      insurance: 'Elective / Easy EMI',
      leadTime: 'Same Week'
    }
  ];

  selectedSurgeryProcedure = signal<string>('Cataract Eye Surgery (Phaco + Foldable IOL)');
  surgeryPatientName = signal<string>('');
  surgeryPatientPhone = signal<string>('');
  surgeryCity = signal<string>('Bangalore');

  // Medicines Catalog
  readonly medicineProducts = [
    { id: 'med-1', name: 'Dolo 650mg Paracetamol', pack: 'Strip of 15 tablets', price: 32, mrp: 38, category: 'Fever & Pain Relief' },
    { id: 'med-2', name: 'Vitamin D3 60,000 IU', pack: 'Box of 4 softgels', price: 120, mrp: 160, category: 'Vitamins & Bone Health' },
    { id: 'med-3', name: 'Pan-D Gastro-Resistant', pack: 'Strip of 10 capsules', price: 199, mrp: 240, category: 'Digestion & Antacid' },
    { id: 'med-4', name: 'Augmentin 625 Duo', pack: 'Strip of 10 tablets', price: 215, mrp: 255, category: 'Prescription Antibiotic' },
    { id: 'med-5', name: 'Accu-Chek Active 50 Strips', pack: 'Test strips pack', price: 849, mrp: 1049, category: 'Diabetes Care' },
    { id: 'med-6', name: 'Digital Upper Arm BP Monitor', pack: 'Omron Hem-7120 Device', price: 1799, mrp: 2450, category: 'Medical Device' }
  ];

  medicineCart = signal<{ id: string; name: string; price: number; qty: number }[]>([]);
  isPrescriptionUploaded = signal<boolean>(false);
  uploadedFileName = signal<string>('');

  cartTotal = computed(() => {
    return this.medicineCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  });

  // Modal Triggers & Handlers
  openServiceModal(type: 'lab' | 'surgery' | 'medicine') {
    this.serviceActionSuccess.set(null);
    this.activeServiceModal.set(type);
  }

  closeServiceModal() {
    this.activeServiceModal.set(null);
    this.serviceActionSuccess.set(null);
  }

  openAppointmentModal() {
    this.closeProfileDrawer();
    this.isAppointmentDetailsModalOpen.set(true);
  }

  closeAppointmentModal() {
    this.isAppointmentDetailsModalOpen.set(false);
  }

  bookLabPackage(pkgTitle: string) {
    this.serviceActionSuccess.set(`Booking confirmed for ${pkgTitle}! Certified Healio phlebotomist assigned with free home sample collection.`);
  }

  submitSurgeryInquiry() {
    const proc = this.selectedSurgeryProcedure();
    this.serviceActionSuccess.set(`Inquiry registered for ${proc}! A dedicated Healio Surgical Care Coordinator will contact you within 15 minutes.`);
  }

  addToCart(med: { id: string; name: string; price: number }) {
    this.medicineCart.update(cart => {
      const existing = cart.find(c => c.id === med.id);
      if (existing) {
        return cart.map(c => c.id === med.id ? { ...c, qty: c.qty + 1 } : c);
      } else {
        return [...cart, { id: med.id, name: med.name, price: med.price, qty: 1 }];
      }
    });
  }

  removeFromCart(medId: string) {
    this.medicineCart.update(cart => cart.filter(c => c.id !== medId));
  }

  onPrescriptionFileSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (file) {
      this.uploadedFileName.set(file.name);
      this.isPrescriptionUploaded.set(true);
    } else {
      this.uploadedFileName.set('Prescription_Rao_Apollo.pdf');
      this.isPrescriptionUploaded.set(true);
    }
  }

  checkoutMedicineOrder() {
    this.serviceActionSuccess.set(`Order successfully submitted! 20% discount applied. Guaranteed express delivery within 2 hours to your doorstep.`);
    this.medicineCart.set([]);
  }

  // --- Dedicated Video Consultation Actions ---
  scrollToVideoConsult() {
    this.activeNav.set('video');
    setTimeout(() => {
      const el = document.getElementById('video-consultations') || document.querySelector('.video-consult-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('pulse-highlight');
        setTimeout(() => el.classList.remove('pulse-highlight'), 1800);
      }
    }, 80);
  }

  startVideoCall(doctor: VideoDoctor) {
    this.addToRecentlyViewed({
      id: 'vdoc-' + doctor.id,
      title: doctor.name,
      subtitle: `Video Call • ${doctor.specialty}`,
      type: 'doctor',
      query: doctor.name
    });
    this.isAiDocModalOpen.set(true);
  }

  // --- Functional Bottom Navigation ---
  navigateBottom(tab: 'home' | 'in-person' | 'video' | 'account') {
    this.activeNav.set(tab);
    if (tab === 'home') {
      this.resetAllFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'in-person') {
      this.scrollToDoctors();
    } else if (tab === 'video') {
      this.scrollToVideoConsult();
    } else if (tab === 'account') {
      this.toggleProfileDrawer();
    }
  }

  filteredSpecialities() {
    return this.specialities().filter(s => s.category === this.activeCareTab());
  }
}