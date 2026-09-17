import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationModalComponent } from '../../shared/location-modal/location-modal';
import { AidocModalComponent } from '../../shared/aidoc-modal/aidoc-modal';

interface Speciality {
  name: string;
  image: string;
  category: 'general' | 'advanced';
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationModalComponent, AidocModalComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent implements OnInit {
  selectedCity = signal<string>('Bangalore');
  isLocationModalOpen = signal<boolean>(false);
  isAiDocModalOpen = signal<boolean>(false);
  activeCareTab = signal<'general' | 'advanced'>('general');
  searchQuery = signal<string>('');
  activeNav = signal<'home' | 'in-person' | 'video' | 'account'>('home');

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
      image: 'https://th.bing.com/th/q=Logo+Lung+Human+Florist&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-IN&cc=IN&setlang=en&adlt=moderate&t=1&mw=247', 
      category: 'advanced' 
    }
  ]);

  ngOnInit() {
    const saved = localStorage.getItem('healio_selected_city');
    if (saved) {
      this.selectedCity.set(saved);
    }
  }

  openLocationModal() {
    this.isLocationModalOpen.set(true);
  }

  onLocationConfirmed(loc: { city: string; address: string; lat: number; lng: number }) {
    this.selectedCity.set(loc.city);
    localStorage.setItem('healio_selected_city', loc.city);
    this.isLocationModalOpen.set(false);
  }

  filteredSpecialities() {
    return this.specialities().filter(s => s.category === this.activeCareTab());
  }
}