import type { Film } from '../../../types/models';

/** Separate current editions verified against Kodak; never remap legacy catalog IDs.
 * Source pages, roll formats and catalog numbers: generated-review/kodak-current-editions-01/products.json.
 * P3200 uses the marketed exposure index in the app's ISO/EI field. */
export const currentKodakFilms: Film[] = [
  {
    "id": "kodak-kodacolor-100-current",
    "brand": "Kodak",
    "name": "Kodacolor 100",
    "iso": 100,
    "type": "color",
    "process": "C-41",
    "format": "35mm",
    "formats": [
      "35mm"
    ],
    "status": "current",
    "aliases": [
      "Kodacolor 100",
      "new edition",
      "current edition",
      "7517667"
    ],
    "imageKey": "kodak-kodacolor-100-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-kodacolor-200-current",
    "brand": "Kodak",
    "name": "Kodacolor 200",
    "iso": 200,
    "type": "color",
    "process": "C-41",
    "format": "35mm",
    "formats": [
      "35mm"
    ],
    "status": "current",
    "aliases": [
      "Kodacolor 200",
      "new edition",
      "current edition",
      "7517675"
    ],
    "imageKey": "kodak-kodacolor-200-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektacolor-pro-160-current",
    "brand": "Kodak",
    "name": "Ektacolor Pro 160",
    "iso": 160,
    "type": "color",
    "process": "C-41",
    "format": "35mm",
    "formats": [
      "35mm",
      "120"
    ],
    "status": "current",
    "aliases": [
      "Ektacolor Pro 160",
      "new edition",
      "current edition",
      "7519549",
      "7519598"
    ],
    "imageKey": "kodak-ektacolor-pro-160-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektacolor-pro-400-current",
    "brand": "Kodak",
    "name": "Ektacolor Pro 400",
    "iso": 400,
    "type": "color",
    "process": "C-41",
    "format": "35mm",
    "formats": [
      "35mm",
      "120"
    ],
    "status": "current",
    "aliases": [
      "Ektacolor Pro 400",
      "new edition",
      "current edition",
      "7519523",
      "7519580",
      "7519606"
    ],
    "imageKey": "kodak-ektacolor-pro-400-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektacolor-pro-800-current",
    "brand": "Kodak",
    "name": "Ektacolor Pro 800",
    "iso": 800,
    "type": "color",
    "process": "C-41",
    "format": "35mm",
    "formats": [
      "35mm",
      "120"
    ],
    "status": "current",
    "aliases": [
      "Ektacolor Pro 800",
      "new edition",
      "current edition",
      "7519531",
      "7519614"
    ],
    "imageKey": "kodak-ektacolor-pro-800-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektapan-100-current",
    "brand": "Kodak",
    "name": "Ektapan 100",
    "iso": 100,
    "type": "black-and-white",
    "process": "B&W",
    "format": "35mm",
    "formats": [
      "35mm",
      "120"
    ],
    "status": "current",
    "aliases": [
      "Ektapan 100",
      "new edition",
      "current edition",
      "7519556",
      "7519630"
    ],
    "imageKey": "kodak-ektapan-100-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektapan-400-current",
    "brand": "Kodak",
    "name": "Ektapan 400",
    "iso": 400,
    "type": "black-and-white",
    "process": "B&W",
    "format": "35mm",
    "formats": [
      "35mm",
      "120"
    ],
    "status": "current",
    "aliases": [
      "Ektapan 400",
      "new edition",
      "current edition",
      "7519564",
      "7519622"
    ],
    "imageKey": "kodak-ektapan-400-current",
    "source": "builtin",
    "isCustom": false
  },
  {
    "id": "kodak-ektapan-p3200-current",
    "brand": "Kodak",
    "name": "Ektapan P3200",
    "iso": 3200,
    "type": "black-and-white",
    "process": "B&W",
    "format": "35mm",
    "formats": [
      "35mm"
    ],
    "status": "current",
    "aliases": [
      "Ektapan P3200",
      "new edition",
      "current edition",
      "7519572"
    ],
    "imageKey": "kodak-ektapan-p3200-current",
    "source": "builtin",
    "isCustom": false
  }
];
