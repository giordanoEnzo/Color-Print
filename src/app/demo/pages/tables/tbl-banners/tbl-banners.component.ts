import { Component, OnInit } from '@angular/core';
import { BannerService, BannerFilesResponse, BannerFixedSlot } from 'src/app/services/banner.service';
import { ToastrService } from 'ngx-toastr';

type SlotKey = 'b1' | 'b2' | 'b3' | 'b4';
const MAP: Record<SlotKey, BannerFixedSlot> = { b1: 'B1', b2: 'B2', b3: 'B3', b4: 'B4' };

@Component({
  selector: 'app-tbl-banners',
  templateUrl: './tbl-banners.component.html',
  styleUrls: ['./tbl-banners.component.scss']
})
export class TblBannersComponent implements OnInit {
  carregando = false;

  b1Url: string | null = null;
  b2Url: string | null = null;
  b3Url: string | null = null;
  b4Url: string | null = null;

  b1File?: File;
  b2File?: File;
  b3File?: File;
  b4File?: File;

  constructor(private banners: BannerService, private toast: ToastrService) {}

  ngOnInit(): void { this.load(); }

  private apply(res: BannerFilesResponse) {
    this.b1Url = res.B1;
    this.b2Url = res.B2;
    this.b3Url = res.B3;
    this.b4Url = res.B4;
  }

  load() {
    this.carregando = true;
    this.banners.getAll().subscribe({
      next: r => { this.apply(r); this.carregando = false; },
      error: _ => { this.carregando = false; this.toast.error('Erro ao carregar banners'); }
    });
  }

  onFileChange(slot: SlotKey, ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = () => {
      if (slot === 'b1') { this.b1File = file; this.b1Url = reader.result as string; }
      if (slot === 'b2') { this.b2File = file; this.b2Url = reader.result as string; }
      if (slot === 'b3') { this.b3File = file; this.b3Url = reader.result as string; }
      if (slot === 'b4') { this.b4File = file; this.b4Url = reader.result as string; }
    };
    reader.readAsDataURL(file);
  }

  salvar(slot: SlotKey) {
    const file =
      slot === 'b1' ? this.b1File :
      slot === 'b2' ? this.b2File :
      slot === 'b3' ? this.b3File :
      this.b4File;

    if (!file) { this.toast.info('Selecione uma imagem JPEG.'); return; }

    this.carregando = true;
    this.banners.updateOne(MAP[slot], file).subscribe({
      next: r => {
        this.apply(r);
        if (slot === 'b1') this.b1File = undefined;
        if (slot === 'b2') this.b2File = undefined;
        if (slot === 'b3') this.b3File = undefined;
        if (slot === 'b4') this.b4File = undefined;
        this.carregando = false;
        this.toast.success('Banner salvo!');
      },
      error: e => { this.carregando = false; this.toast.error(e?.error?.erro || 'Erro ao salvar'); }
    });
  }

  limpar(slot: SlotKey) {
    this.carregando = true;
    this.banners.clear(MAP[slot]).subscribe({
      next: _ => {
        if (slot==='b1') { this.b1Url=null; this.b1File=undefined; }
        if (slot==='b2') { this.b2Url=null; this.b2File=undefined; }
        if (slot==='b3') { this.b3Url=null; this.b3File=undefined; }
        if (slot==='b4') { this.b4Url=null; this.b4File=undefined; }
        this.carregando=false;
        this.toast.success('Banner removido.');
      },
      error: _ => { this.carregando=false; this.toast.error('Erro ao remover'); }
    });
  }
}
