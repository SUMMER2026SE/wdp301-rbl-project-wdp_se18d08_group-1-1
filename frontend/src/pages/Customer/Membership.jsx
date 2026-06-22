import { useState, useEffect } from 'react';
import { Crown, Sparkles, Check, Loader2, ArrowRight, AlertCircle, QrCode, Wallet } from 'lucide-react';
import { getTicketPackages, createSubscriptionPayment, verifySubscriptionPayment, paySubscriptionWithWallet } from '../../services/subscriptionService';
import { getWalletInfo } from '../../services/walletService';
import { getMyVehicles } from '../../services/vehicleService';
import { apiFetch } from '../../services/api';
import { notifyAuthChange } from '../../services/authStorage';
import ParkingMapViewer from '../../components/ParkingMapViewer';
import { QRCodeSVG } from 'qrcode.react';

export default function Membership() {
  const [packages, setPackages] = useState({ monthly: null, yearly: null });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]); // [{ floorId, slotCode }]
  const [floors, setFloors] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [dbSlots, setDbSlots] = useState([]);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('payos');

  const isMonthlyVIP = user?.membership?.isVip && user.membership.packageId === packages.monthly?._id;
  const isYearlyVIP = user?.membership?.isVip && user.membership.packageId === packages.yearly?._id;

  const syncCurrentUserProfile = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const { ok, data } = await apiFetch('/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (ok && data?.success) {
      const cached = JSON.parse(sessionStorage.getItem('valo_user') || 'null');
      const updatedUser = {
        ...(cached || {}),
        ...data.data,
        avatar: data.data.profile?.avatar || cached?.avatar || cached?.profile?.avatar || '',
      };
      sessionStorage.setItem('valo_user', JSON.stringify(updatedUser));
      setUser(data.data);
      notifyAuthChange();
    }
  };

  // Check URL for PayOS return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderCode = urlParams.get('orderCode');
    const cancel = urlParams.get('cancel');

    if (orderCode) {
      if (cancel === 'true') {
        alert('Đã hủy giao dịch thanh toán.');
        // Xoá query string
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setVerifying(true);
        verifySubscriptionPayment(orderCode).then(async (res) => {
          if (res.ok) {
            await syncCurrentUserProfile();
            setSuccess(true);
          } else {
            alert(res.data?.message || 'Giao dịch chưa hoàn tất hoặc thất bại');
          }
        }).finally(() => {
          setVerifying(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    }
  }, []);

  useEffect(() => {
    const fetchDbSlots = async () => {
      if (!currentFloorId) {
        setDbSlots([]);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors/${currentFloorId}/slots`);
        const data = await res.json();
        if (data.success) {
          setDbSlots(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch slots", err);
      }
    };
    fetchDbSlots();
  }, [currentFloorId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pkgRes, vRes, floorRes, profileRes, walletRes] = await Promise.all([
          getTicketPackages(),
          getMyVehicles(),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors`).then(r => r.json()),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).then(r => r.json()),
          getWalletInfo()
        ]);
        
        if (pkgRes.ok && pkgRes.data?.data) {
          const pkgs = pkgRes.data.data;
          setPackages({
            monthly: pkgs.find(p => p.type === 'monthly'),
            yearly: pkgs.find(p => p.type === 'yearly')
          });
        }
        if (vRes.ok) {
          setVehicles(vRes.data?.data || []);
        }
        if (floorRes.success) {
          setFloors(floorRes.data || []);
          if (floorRes.data && floorRes.data.length > 0) {
            setCurrentFloorId(floorRes.data[0]._id);
          }
        }
        if (profileRes && profileRes.success) {
          setUser(profileRes.data);
        }
        if (walletRes.ok && walletRes.data?.success) {
          setWalletBalance(walletRes.data.data.balance || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBuyPackage = (pkg) => {
    setSelectedPackage(pkg);
    setSelectedSlots([]);
    setShowSlotModal(true);
  };

  const handleSelectSlot = (floorId, slotData) => {
    const existingIndex = selectedSlots.findIndex(s => s.floorId === floorId && s.slotCode === slotData.slotNumber);
    if (existingIndex >= 0) {
      // Remove
      setSelectedSlots(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add
      const maxSlots = Math.min(3, vehicles.length);
      if (vehicles.length === 0) {
        alert("Bạn cần thêm xe vào danh sách trước khi mua thẻ VIP.");
        return;
      }
      if (selectedSlots.length >= maxSlots) {
        alert(`Bạn chỉ được chọn tối đa ${maxSlots} ô đỗ (tương ứng với số lượng xe của bạn).`);
        return;
      }
      setSelectedSlots(prev => [...prev, { floorId, slotCode: slotData.slotNumber }]);
    }
  };

  const handleConfirmSlots = async () => {
    if (selectedSlots.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ô đỗ để giữ chỗ.");
      return;
    }
    
    try {
      setShowSlotModal(false);
      setVerifying(true); // Hiển thị trạng thái đang xử lý

      if (paymentMethod === 'wallet') {
        const res = await paySubscriptionWithWallet(selectedPackage._id, selectedSlots);
        if (res.ok && res.data?.success) {
          await syncCurrentUserProfile();
          setSuccess(true);
        } else {
          alert(res.data?.message || "Lỗi khi thanh toán bằng ví Valo");
        }
        setVerifying(false);
      } else {
        const res = await createSubscriptionPayment(selectedPackage._id, selectedSlots);
        if (res.ok && res.data?.data?.checkoutUrl) {
          // Chuyển hướng thẳng sang trang PayOS
          window.location.href = res.data.data.checkoutUrl;
        } else {
          alert(res.data?.message || "Lỗi khi tạo giao dịch PayOS");
          setVerifying(false);
        }
      }
    } catch {
      alert("Lỗi mạng");
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-gold mb-4" />
        <p className="text-gray-500 font-medium">Đang xử lý giao dịch, vui lòng đợi...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Banner */}
      <div className="bg-[#181C23] text-white pt-24 pb-32 px-6 rounded-b-[40px] text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold via-[#181C23] to-[#181C23]"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="font-bold">★</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
              <Crown size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles size={20} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-gold">Premium</span></h1>
          <p className="text-gray-400 text-lg">Chọn gói phù hợp - Nâng tầm trải nghiệm</p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto px-6 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Member Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col relative z-10 transition hover:-translate-y-2">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 mx-auto mb-4">
              <span className="font-black text-xl">M</span>
            </div>
            <h3 className="text-center font-black text-gray-900 tracking-widest text-sm mb-6">MEMBER</h3>
            <div className="text-center py-4 rounded-2xl bg-gray-50 border border-gray-100 mb-8">
              <div className="text-2xl font-black text-gray-900">Mặc định</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gray-400 shrink-0" />
                <span>Đặt chỗ đỗ xe theo giờ / ngày</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gray-400 shrink-0" />
                <span>Sử dụng dịch vụ mở rộng (trả phí)</span>
              </li>
              <li className="flex gap-3 text-gray-400 text-sm">
                <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0 mt-0.5"></div>
                <span>Chỗ đỗ xe cố định riêng biệt</span>
              </li>
              <li className="flex gap-3 text-gray-400 text-sm">
                <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0 mt-0.5"></div>
                <span>Miễn phí Check-in / Không cần đặt trước</span>
              </li>
            </ul>
            <button disabled className="w-full py-4 rounded-xl font-bold text-gray-500 bg-gray-100">
              Đang sử dụng
            </button>
          </div>

          {/* Monthly Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-gold flex flex-col relative z-20 scale-105 transition hover:-translate-y-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-white text-[10px] font-black tracking-widest py-1.5 px-4 rounded-full uppercase">
              Phổ Biến
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold mx-auto mb-4">
              <Crown size={24} />
            </div>
            <h3 className="text-center font-black text-gray-900 tracking-widest text-sm mb-6">VIP THÁNG</h3>
            <div className="text-center py-4 rounded-2xl bg-gold/5 border border-gold/20 mb-8">
              <div className="text-2xl font-black text-gold">
                {packages.monthly?.price ? packages.monthly.price.toLocaleString('vi-VN') : '---'}đ
              </div>
              <div className="text-sm font-medium text-gray-500 mt-1">mỗi tháng</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gold shrink-0" />
                <span>Toàn quyền của gói Member</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gold shrink-0" />
                <span>Sở hữu Ô đỗ cố định mang tên bạn</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gold shrink-0" />
                <span>Miễn phí Check-in tự động 24/7</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-gold shrink-0" />
                <span>Không cần đặt chỗ trước khi đến</span>
              </li>
            </ul>
            {isMonthlyVIP || isYearlyVIP ? (
              <button disabled className="w-full py-4 rounded-xl font-bold text-gray-500 bg-gray-100">
                {isYearlyVIP ? "Đã bao gồm trong gói Năm" : "Đang sử dụng"}
              </button>
            ) : (
              <button 
                onClick={() => handleBuyPackage(packages.monthly)}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-yellow-500 to-gold hover:opacity-90 transition shadow-lg shadow-gold/20"
              >
                Nâng cấp ngay
              </button>
            )}
          </div>

          {/* Yearly Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-purple-100 flex flex-col relative z-10 transition hover:-translate-y-2">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mx-auto mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-center font-black text-gray-900 tracking-widest text-sm mb-6">NOVA NĂM</h3>
            <div className="text-center py-4 rounded-2xl bg-purple-50/50 border border-purple-100 mb-8">
              <div className="text-2xl font-black text-purple-600">
                {packages.yearly?.price ? packages.yearly.price.toLocaleString('vi-VN') : '---'}đ
              </div>
              <div className="text-sm font-medium text-gray-500 mt-1">cho 1 năm</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-purple-500 shrink-0" />
                <span>Toàn quyền của gói VIP Tháng</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm font-bold text-purple-600">
                <Check size={18} className="text-purple-500 shrink-0" />
                <span>Tặng 12 lần rửa xe / bảo dưỡng miễn phí</span>
              </li>
              <li className="flex gap-3 text-gray-600 text-sm">
                <Check size={18} className="text-purple-500 shrink-0" />
                <span>Ưu tiên giải đáp thắc mắc (Support)</span>
              </li>
            </ul>
            {isYearlyVIP ? (
              <button disabled className="w-full py-4 rounded-xl font-bold text-gray-500 bg-gray-100">
                Đang sử dụng
              </button>
            ) : (
              <button 
                onClick={() => handleBuyPackage(packages.yearly)}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 transition shadow-lg shadow-purple-500/20"
              >
                Nâng cấp ngay
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Select Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 bg-[#181C23]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">Chọn Ô Đỗ Cố Định</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Bạn đang có {vehicles.length} xe đăng ký. Bạn có thể chọn {Math.min(3, vehicles.length)} ô đỗ.
                </p>
              </div>
              <button 
                onClick={() => setShowSlotModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col md:flex-row gap-6">
              <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative min-h-[400px]">
                <ParkingMapViewer
                  floors={floors}
                  currentFloorId={currentFloorId}
                  dbSlots={dbSlots}
                  onFloorSelect={setCurrentFloorId}
                  onSelectSlot={(slotData) => handleSelectSlot(currentFloorId, { slotNumber: slotData.name || slotData.id })}
                  selectedSlotId={selectedSlots.filter(s => s.floorId === currentFloorId).map(s => s.slotCode)}
                  is2DMode={true}
                  hideUI={true}
                  theme="dark"
                  staticFit={true}
                />
              </div>
              
              <div className="w-full md:w-80 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                <div className="mb-6">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tầng đỗ xe</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                    value={currentFloorId || ''}
                    onChange={(e) => setCurrentFloorId(e.target.value)}
                  >
                    {floors.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-6 flex-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => setPaymentMethod('payos')}
                      className={`relative p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden ${
                        paymentMethod === 'payos' 
                        ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                        : 'border-gray-800 bg-[#181c23] hover:border-gray-700 hover:bg-[#1f242d]'
                      }`}
                    >
                      {paymentMethod === 'payos' && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check size={14} className="text-cyan-500" />
                        </div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentMethod === 'payos' ? 'bg-cyan-500/20 text-cyan-500' : 'bg-gray-800 text-gray-400'}`}>
                        <QrCode size={16} />
                      </div>
                      <div className="text-center">
                        <div className={`font-black text-xs mb-0.5 ${paymentMethod === 'payos' ? 'text-cyan-400' : 'text-gray-300'}`}>PayOS</div>
                        <div className="text-[9px] text-gray-500 font-medium">Mã QR / Chuyển khoản</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setPaymentMethod('wallet')}
                      className={`relative p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden ${
                        paymentMethod === 'wallet' 
                        ? 'border-gold bg-gold/10 shadow-[0_0_10px_rgba(251,191,36,0.15)]' 
                        : 'border-gray-800 bg-[#181c23] hover:border-gray-700 hover:bg-[#1f242d]'
                      }`}
                    >
                      {paymentMethod === 'wallet' && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check size={14} className="text-gold" />
                        </div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentMethod === 'wallet' ? 'bg-gold/20 text-gold' : 'bg-gray-800 text-gray-400'}`}>
                        <Wallet size={16} />
                      </div>
                      <div className="text-center">
                        <div className={`font-black text-xs mb-0.5 ${paymentMethod === 'wallet' ? 'text-gold' : 'text-gray-300'}`}>Ví Valo</div>
                        <div className="text-[9px] text-gray-500 font-medium">Số dư: {walletBalance.toLocaleString('vi-VN')}đ</div>
                      </div>
                    </button>
                  </div>
                  
                  {paymentMethod === 'wallet' && selectedPackage && walletBalance < selectedPackage.price && (
                    <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-1.5">
                      <AlertCircle className="shrink-0 w-4 h-4" />
                      <p>Số dư không đủ. Vui lòng nạp thêm hoặc dùng PayOS.</p>
                    </div>
                  )}

                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Đã chọn ({selectedSlots.length} / {Math.min(3, vehicles.length)})
                  </label>
                  <div className="space-y-2">
                    {selectedSlots.map(s => (
                      <div key={`${s.floorId}-${s.slotCode}`} className="flex items-center justify-between p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold font-bold">
                        <span>Ô đỗ: {s.slotCode}</span>
                        <Check size={18} />
                      </div>
                    ))}
                    {selectedSlots.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Hãy nhấp vào bản đồ để chọn ô đỗ.
                      </div>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={handleConfirmSlots}
                  disabled={paymentMethod === 'wallet' && selectedPackage && walletBalance < selectedPackage.price}
                  className={`w-full py-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 ${paymentMethod === 'wallet' && selectedPackage && walletBalance < selectedPackage.price ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gray-900 hover:bg-black'}`}
                >
                  Thanh toán ngay <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-[#181C23]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-500 mx-auto mb-6">
              <Crown size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Chào mừng VIP!</h3>
            <p className="text-gray-500 mb-8">Giao dịch thành công. Đặc quyền của bạn đã được kích hoạt và ô đỗ đã được giữ riêng.</p>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
