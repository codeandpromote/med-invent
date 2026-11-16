'use client';

import Image from 'next/image';
import heroOphthalmicImg from '@/src/assets/images/hero_ophthalmic_devices_1794818480816.jpg';
import expanderImg from '@/src/assets/images/product_pupil_expander_1794818481479.jpg';
import forcepsImg from '@/src/assets/images/product_surgical_forceps_1794818482629.jpg';

export function HeroDeviceVisual() {
  return (
    <div className="relative h-full min-h-[240px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <Image
        src={heroOphthalmicImg}
        alt="B-HEX Pupil Expander ring and brushed stainless steel 23G micro-surgical forceps in sterile tray"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function ProductThumbnail({
  imageKey,
  alt,
}: {
  imageKey: 'expander' | 'forceps' | 'hero';
  alt: string;
}) {
  const src =
    imageKey === 'forceps'
      ? forcepsImg
      : imageKey === 'hero'
        ? heroOphthalmicImg
        : expanderImg;

  return (
    <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:w-28">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="120px"
        className="object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function OfficialRateCardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Image
        src="/assets/aistudio/Customer_Rates_B-HEX__B-HEX_2.0__B-OCTA___B-HEX_Forceps_27048ef1.jpg"
        alt="Med Invent Devices Pvt Ltd Official Customer Rate Card"
        width={1024}
        height={920}
        className="h-auto w-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
