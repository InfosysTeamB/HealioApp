import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
  @Output() locationSelected = new EventEmitter<{ city: string; address: string; lat: number; lng: number }>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map?: L.Map;
  private marker?: L.Marker;

  searchQuery = signal<string>('');
  selectedCityName = signal<string>('Bangalore');
  selectedAddress = signal<string>('Drag marker or search above');
  isLocating = signal<boolean>(false);

  currentLat = 12.9716;
  currentLng = 77.5946;

  ngOnInit() {
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
    setTimeout(() => this.initMap(), 100);
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

    this.reverseGeocode(this.currentLat, this.currentLng);
  }

  detectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by browser.');
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
        }
        this.reverseGeocode(this.currentLat, this.currentLng);
        this.isLocating.set(false);
      },
      () => {
        alert('Could not retrieve GPS location.');
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async searchAddress() {
    const q = this.searchQuery().trim();
    if (!q) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        this.currentLat = parseFloat(data[0].lat);
        this.currentLng = parseFloat(data[0].lon);

        if (this.map && this.marker) {
          this.map.setView([this.currentLat, this.currentLng], 15);
          this.marker.setLatLng([this.currentLat, this.currentLng]);
        }
        this.reverseGeocode(this.currentLat, this.currentLng);
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  }

  private formatGranularAddress(data: any): { label: string; display: string } {
    if (!data || !data.address) {
      return { label: 'Bangalore', display: 'Selected Location' };
    }
    const a = data.address;
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
        a.county ||
        a.state_district ||
        a.district ||
        a.state ||
        '';
    }

    let label = '';
    if (
      locality &&
      district &&
      locality.toLowerCase() !== district.toLowerCase() &&
      !district.toLowerCase().includes(locality.toLowerCase()) &&
      !locality.toLowerCase().includes(district.toLowerCase())
    ) {
      label = `${locality}, ${district}`;
    } else if (locality) {
      label = locality;
    } else if (district) {
      label = district;
    } else {
      label = 'Bangalore';
    }

    const display = (data.display_name || '').split(',').slice(0, 3).join(',');
    return { label, display: display || label };
  }

  private async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const { label, display } = this.formatGranularAddress(data);
        this.selectedCityName.set(label);
        this.selectedAddress.set(display);
      }
    } catch {
      this.selectedCityName.set('Selected Area');
      this.selectedAddress.set(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
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