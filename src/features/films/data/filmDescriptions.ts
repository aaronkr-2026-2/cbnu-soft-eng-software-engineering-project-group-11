import type { Film } from '../../../types/models';

type Copy = [en: string, vi: string, ko: string];
const notes: Record<string, Copy> = {
  c200: ['A daylight-balanced color negative stock for everyday photography. Good daylight or flash helps make the most of its ISO 200 speed.', 'Film âm bản màu cân bằng ánh sáng ban ngày cho chụp đời thường. Ánh sáng tốt hoặc flash giúp tận dụng độ nhạy ISO 200.', '일상 촬영을 위한 주광용 컬러 네거티브 필름입니다. 밝은 낮이나 플래시에서 ISO 200 감도를 활용하기 좋습니다.'],
  portra: ['A useful choice for portraits with natural skin tones. Choose the speed to match available light.', 'Phù hợp chụp chân dung với màu da tự nhiên. Chọn độ nhạy phù hợp với ánh sáng.', '자연스러운 피부색을 담는 인물 사진에 적합합니다. 사용 가능한 빛에 맞춰 감도를 선택하세요.'],
  everyday: ['Suitable for travel and everyday scenes. Good daylight helps keep shutter speeds practical.', 'Phù hợp chụp du lịch và đời thường. Ánh sáng ban ngày giúp dễ chọn tốc độ màn trập.', '여행과 일상 장면에 적합합니다. 밝은 낮에는 실용적인 셔터 속도를 확보하기 쉽습니다.'],
  ektar: ['Fine grain and saturated colors suit landscapes and detailed daylight scenes.', 'Hạt mịn và màu sắc bão hòa phù hợp phong cảnh và cảnh ban ngày nhiều chi tiết.', '미세한 입자와 풍부한 색감은 풍경과 섬세한 낮 장면에 적합합니다.'],
  reversal: ['Produces positive transparencies. Careful metering helps retain highlight and shadow detail.', 'Tạo ảnh dương bản trong suốt. Đo sáng cẩn thận giúp giữ chi tiết vùng sáng và tối.', '양화 슬라이드를 만듭니다. 정확한 측광으로 밝은 부분과 그림자의 디테일을 유지하세요.'],
  velvia: ['Strong color saturation suits nature and landscape work. Meter carefully when contrast is high.', 'Màu sắc bão hòa mạnh phù hợp thiên nhiên và phong cảnh. Đo sáng cẩn thận khi tương phản cao.', '높은 채도는 자연과 풍경 사진에 적합합니다. 대비가 높은 장면에서는 신중하게 측광하세요.'],
  pro400h: ['A discontinued portrait film known for natural color reproduction. Storage history matters when using expired rolls.', 'Film chân dung đã ngừng sản xuất, nổi bật với khả năng tái hiện màu tự nhiên. Cần lưu ý điều kiện bảo quản khi dùng film hết hạn.', '자연스러운 색 재현으로 알려진 단종 인물용 필름입니다. 유효기간이 지난 롤은 보관 상태를 고려하세요.'],
  bw: ['Exposure and development both influence contrast and grain. Discuss your intended look with the lab.', 'Phơi sáng và tráng film đều ảnh hưởng tương phản và hạt. Trao đổi với lab về hình ảnh mong muốn.', '노출과 현상은 대비와 입자에 모두 영향을 줍니다. 원하는 표현을 현상소와 상의하세요.'],
  daylightCinema: ['Daylight-balanced motion-picture stock. Confirm ECN-2 processing and rem-jet handling with your lab before shooting.', 'Film điện ảnh cân bằng ánh sáng ban ngày. Hãy xác nhận quy trình ECN-2 và xử lý rem-jet với lab trước khi chụp.', '주광용 영화 필름입니다. 촬영 전에 현상소의 ECN-2 현상과 렘젯 처리 여부를 확인하세요.'],
  tungstenCinema: ['Tungsten-balanced motion-picture stock. Confirm ECN-2 processing and rem-jet handling with your lab before shooting.', 'Film điện ảnh cân bằng ánh sáng tungsten. Hãy xác nhận quy trình ECN-2 và xử lý rem-jet với lab trước khi chụp.', '텅스텐 조명용 영화 필름입니다. 촬영 전에 현상소의 ECN-2 현상과 렘젯 처리 여부를 확인하세요.'],
  doublex: ['Motion-picture black-and-white stock rated at EI 250 in daylight and EI 200 under tungsten. Confirm the development process with your lab.', 'Film điện ảnh đen trắng có EI 250 dưới ánh sáng ban ngày và EI 200 dưới đèn tungsten. Xác nhận quy trình tráng với lab.', '주광에서 EI 250, 텅스텐에서 EI 200인 흑백 영화 필름입니다. 현상소와 현상 방식을 확인하세요.'],
  kodachrome: ['An archival reversal stock whose K-14 color process is no longer commercially available. Discuss options with a specialist before exposing an old roll.', 'Film dương bản lưu trữ; quy trình tráng màu K-14 không còn dịch vụ thương mại. Hãy hỏi đơn vị chuyên môn trước khi chụp cuộn cũ.', 'K-14 컬러 현상 서비스를 더 이상 상업적으로 이용할 수 없는 역사적인 양화 필름입니다. 오래된 롤을 촬영하기 전에 전문 현상소와 상담하세요.'],
  historical: ['A historical stock kept here for older rolls and scans. Expired film may behave differently depending on age and storage.', 'Film lịch sử được giữ trong catalog cho các cuộn và bản scan cũ. Film hết hạn có thể thay đổi tùy tuổi và điều kiện bảo quản.', '오래된 롤과 스캔을 기록하기 위해 수록한 역사적인 필름입니다. 유효기간이 지난 필름은 나이와 보관 상태에 따라 결과가 달라질 수 있습니다.'],
  specialty: ['A specialty stock for archival use. Confirm exposure and processing requirements with your supplier or lab.', 'Film chuyên dụng dùng trong lưu trữ. Xác nhận yêu cầu phơi sáng và tráng film với nhà cung cấp hoặc lab.', '기록용으로 수록한 특수 필름입니다. 공급업체나 현상소에 노출과 현상 조건을 확인하세요.'],
};

/** Localized editorial descriptions attach to the existing Film, without another catalog. */
export function getBuiltInFilmDescription(film: Film): NonNullable<Film['shortDescription']> {
  let note = film.status === 'discontinued' ? notes.historical : film.status === 'specialty' ? notes.specialty : notes.everyday;
  if (film.id === 'fujifilm-c200' || film.id === 'fujifilm-200') note = notes.c200;
  else if (/^kodak-portra-(160|400|800)$/.test(film.id)) note = notes.portra;
  else if (film.id === 'kodak-ektar-100') note = notes.ektar;
  else if (film.id === 'fujifilm-pro-400h') note = notes.pro400h;
  else if (film.id.includes('kodachrome')) note = notes.kodachrome;
  else if (film.id === 'kodak-double-x-5222') note = notes.doublex;
  else if (film.type === 'cinema') note = /(?:^|-)\d+t(?:-|$)/i.test(film.id) ? notes.tungstenCinema : notes.daylightCinema;
  else if (film.id === 'fujifilm-velvia-50') note = notes.velvia;
  else if (film.type === 'slide' && film.status !== 'discontinued') note = notes.reversal;
  else if (film.type === 'black-and-white' && film.status !== 'discontinued') note = notes.bw;
  const name = `${film.brand} ${film.name}`;
  return { en: `${name} is rated at ISO/EI ${film.iso}. ${note[0]}`,
    vi: `${name} có độ nhạy danh định ISO/EI ${film.iso}. ${note[1]}`,
    ko: `${name}의 표기 감도는 ISO/EI ${film.iso}입니다. ${note[2]}` };
}
