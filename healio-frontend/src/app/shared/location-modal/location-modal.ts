import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-modal',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './location-modal.html', 
  styleUrl: './location-modal.css'    
})
export class LocationModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() initialCity?: string;
  @Input() initialLat?: number;
  @Input() initialLng?: number;

  @Output() locationSelected = new EventEmitter<{ city: string; address: string; lat: number; lng: number }>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map?: L.Map;
  private marker?: L.Marker;

  searchQuery: string = '';
  selectedCityName = signal<string>('Bangalore');
  selectedAddress = signal<string>('Drag marker, click map, or search above');
  isLocating = signal<boolean>(false);
  isSearching = signal<boolean>(false);
  searchError = signal<string | null>(null);

  currentLat = 12.9716;
  currentLng = 77.5946;

  ngOnInit() {
    if (this.initialLat !== undefined && !isNaN(this.initialLat) && this.initialLng !== undefined && !isNaN(this.initialLng)) {
      this.currentLat = this.initialLat;
      this.currentLng = this.initialLng;
    }
    if (this.initialCity) {
      this.selectedCityName.set(this.initialCity);
      this.selectedAddress.set(this.initialCity);
    }

    const iconDefault = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 120);
  }

  private initMap() {
    if (this.map || !this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [this.currentLat, this.currentLng],
      zoom: 13,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([this.currentLat, this.currentLng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.currentLat = pos.lat;
      this.currentLng = pos.lng;
      this.reverseGeocode(pos.lat, pos.lng);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.currentLat = e.latlng.lat;
      this.currentLng = e.latlng.lng;
      this.marker?.setLatLng(e.latlng);
      this.reverseGeocode(this.currentLat, this.currentLng);
    });

    // Invalidate map size once sheet animation completes
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 350);

    if (!this.initialCity || this.selectedAddress() === 'Drag marker, click map, or search above') {
      this.reverseGeocode(this.currentLat, this.currentLng);
    }
  }

  detectLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;

        if (this.map && this.marker) {
          this.map.setView([this.currentLat, this.currentLng], 15);
          this.marker.setLatLng([this.currentLat, this.currentLng]);
          this.map.invalidateSize();
        }
        this.reverseGeocode(this.currentLat, this.currentLng);
        this.isLocating.set(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not retrieve GPS location. Please check browser permissions or select on map.');
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async searchAddress() {
    const q = (this.searchQuery || '').trim();
    if (!q) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search HTTP status ' + res.status);
      const data = await res.json();
      if (data && data.length > 0) {
        this.currentLat = parseFloat(data[0].lat);
        this.currentLng = parseFloat(data[0].lon);

        if (this.map && this.marker) {
          this.map.setView([this.currentLat, this.currentLng], 14);
          this.marker.setLatLng([this.currentLat, this.currentLng]);
          this.map.invalidateSize();
        }
        const { label, display } = this.formatGranularAddress(data[0]);
        this.selectedCityName.set(label);
        this.selectedAddress.set(display);
      } else {
        this.searchError.set('Location not found. Try searching another landmark or click on the map.');
      }
    } catch (e) {
      console.warn('Search error:', e);
      this.searchError.set('Could not fetch address. Please move the pin on the map.');
    } finally {
      this.isSearching.set(false);
    }
  }

  private formatGranularAddress(data: any): { label: string; display: string } {
    if (!data || !data.address) {
      const fallbackDisplay = data?.display_name ? (data.display_name as string).split(',').slice(0, 3).join(',') : 'Selected Location';
      return { label: 'Bangalore', display: fallbackDisplay };
    }
    const a = data.address;

    const cityName = a.city || a.town || a.city_district || a.municipality || '';
    const locality =
      a.suburb ||
      a.neighbourhood ||
      a.quarter ||
      a.residential ||
      a.village ||
      a.hamlet ||
      a.subdistrict ||
      a.borough ||
      '';

    let label = '';
    if (locality && cityName && locality.toLowerCase() !== cityName.toLowerCase()) {
      label = `${locality}, ${cityName}`;
    } else if (locality) {
      const region = a.state_district || a.county || a.state || '';
      label = region ? `${locality}, ${region}` : locality;
    } else if (cityName) {
      label = cityName;
    } else {
      label = a.county || a.state_district || a.state || 'Selected Area';
    }

    const display = (data.display_name || '').split(',').slice(0, 3).join(',');
    return { label, display: display || label };
  }

  private async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (!res.ok) throw new Error('Reverse geocode HTTP status ' + res.status);
      const data = await res.json();
      if (data && data.address) {
        const { label, display } = this.formatGranularAddress(data);
        this.selectedCityName.set(label);
        this.selectedAddress.set(display);
        return;
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
    this.selectedCityName.set('Selected Area');
    this.selectedAddress.set(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
  }

  confirm() {
    this.locationSelected.emit({
      city: this.selectedCityName(),
      address: this.selectedAddress(),
      lat: this.currentLat,
      lng: this.currentLng
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}