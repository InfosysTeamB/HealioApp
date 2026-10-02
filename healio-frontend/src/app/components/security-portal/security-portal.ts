import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClinicalService, AuditLog, ApiEndpoint, NotificationStatus } from '../../services/clinical.service';

@Component({
  selector: 'app-security-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './security-portal.html',
  styleUrls: ['./security-portal.css']
})
export class SecurityPortalComponent implements OnInit {
  notificationStatus: NotificationStatus = { status: 'active', last_run: 'Just now', total_alerts_dispatched: 0 };
  apiEndpoints: ApiEndpoint[] = [];
  auditLogs: AuditLog[] = [];
  searchQuery: string = '';

  constructor(private clinicalService: ClinicalService) {}

  ngOnInit(): void {
    this.clinicalService.getNotificationStatus().subscribe({
      next: (data: NotificationStatus) => (this.notificationStatus = data),
      error: (err: any) => console.error(err)
    });

    this.clinicalService.getApiEndpoints().subscribe({
      next: (data: ApiEndpoint[]) => (this.apiEndpoints = data),
      error: (err: any) => console.error(err)
    });

    this.loadLogs();
  }

  loadLogs(): void {
    this.clinicalService.getAuditLogs().subscribe({
      next: (data: AuditLog[]) => (this.auditLogs = data),
      error: (err: any) => console.error(err)
    });
  }

  get filteredAuditLogs(): AuditLog[] {
    if (!this.searchQuery.trim()) return this.auditLogs;
    const q = this.searchQuery.toLowerCase();
    return this.auditLogs.filter(
      (log) =>
        log.user_identifier.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.formatted_time.toLowerCase().includes(q)
    );
  }
}