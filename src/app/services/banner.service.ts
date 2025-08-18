import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type BannerFixedSlot = 'B1' | 'B2' | 'B3' | 'B4';

export interface BannerFilesResponse {
  B1: string | null;
  B2: string | null;
  B3: string | null;
  B4: string | null;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private api = `${environment.apiUrl}/banner-files`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<BannerFilesResponse> {
    return this.http.get<BannerFilesResponse>(this.api);
  }

  updateOne(slot: BannerFixedSlot, file: File): Observable<BannerFilesResponse> {
    const fd = new FormData();
    fd.append(slot, file);
    return this.http.put<BannerFilesResponse>(this.api, fd);
  }

  updateMany(files: Partial<Record<BannerFixedSlot, File>>): Observable<BannerFilesResponse> {
    const fd = new FormData();
    (Object.keys(files) as BannerFixedSlot[]).forEach(s => {
      const f = files[s];
      if (f) fd.append(s, f);
    });
    return this.http.put<BannerFilesResponse>(this.api, fd);
  }

  clear(slot: BannerFixedSlot) {
    return this.http.delete(`${this.api}/${slot}`);
  }
}
