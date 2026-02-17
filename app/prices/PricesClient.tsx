"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';
import { Rates, PriceItem, GasStation } from '@/lib/data';
import { IoSearch, IoLocation, IoClose, IoNavigate, IoCart, IoArrowBack } from 'react-icons/io5';

interface Props {
    initialItems: PriceItem[];
    initialRates: Rates;
    serverTimestamp?: string;
}

export default function PricesClient({ initialItems, initialRates, serverTimestamp }: Props) {
    // State
    const [rates, setRates] = useState<Rates | null>(initialRates);
    const [rateLoading, setRateLoading] = useState(false);

    const [priceItems, setPriceItems] = useState<PriceItem[]>(initialItems);
    const [itemsLoading, setItemsLoading] = useState(false);
    
    const [lastUpdated, setLastUpdated] = useState<string>(serverTimestamp || new Date().toISOString());

    // Nearby Gas States
    const [nearbyStations, setNearbyStations] = useState<GasStation[]>([]);
    const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Exchange Rate (Client update loop only)
    const fetchRates = async () => {
        try {
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const findNearbyGas = async () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setIsSearchingNearby(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLoc({ lat: latitude, lng: longitude });
            try {
                const res = await fetch(`/api/gas-prices?lat=${latitude}&lng=${longitude}&rad=10`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.ok && data.stations) {
                        setNearbyStations(data.stations);
                        setShowMap(true);
                    } else {
                        setError("주변 주유소를 찾을 수 없습니다.");
                    }
                } else {
                    setError("데이터를 가져오는데 실패했습니다.");
                }
            } catch (err) {
                setError("네트워크 오류가 발생했습니다.");
            } finally {
                setIsSearchingNearby(false);
            }
        }, (err) => {
            setError("위치 정보 권한이 거부되었습니다.");
            setIsSearchingNearby(false);
        });
    };

    // Leaflet Map Logic
    useEffect(() => {
        if (!showMap || nearbyStations.length === 0) return;

        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        const initMap = () => {
            const L = (window as any).L;
            if (!L) return;

            const map = L.map('gas-map').setView([nearbyStations[0].lat, nearbyStations[0].lng], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            }).addTo(map);

            if (userLoc) {
                L.circle([userLoc.lat, userLoc.lng], {
                    radius: 10000,
                    color: "#4285F4",
                    weight: 1,
                    opacity: 0.3,
                    fillColor: "#4285F4",
                    fillOpacity: 0.05,
                    interactive: false
                }).addTo(map);

                const userMarker = L.circleMarker([userLoc.lat, userLoc.lng], {
                    radius: 8,
                    fillColor: "#4285F4",
                    color: "white",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);
                userMarker.bindPopup("내 위치");
            }

            nearbyStations.forEach(s => {
                if (s.diesel > 0 || s.e10 > 0) {
                    const marker = L.marker([s.lat, s.lng]).addTo(map);
                    marker.bindPopup(`
                        <div style="color: #000; font-family: sans-serif;">
                            <strong>${s.brand || s.name}</strong><br/>
                            Diesel: ${s.diesel.toFixed(3)}€<br/>
                            E10: ${s.e10.toFixed(3)}€
                        </div>
                    `);

                    marker.on('click', () => {
                        const element = document.getElementById(`station-${s.id}`);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.style.backgroundColor = 'rgba(66, 133, 244, 0.15)';
                            setTimeout(() => {
                                element.style.backgroundColor = 'transparent';
                            }, 1500);
                        }
                    });
                }
            });

            return map;
        };

        let mapInstance: any;
        if (!(window as any).L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                mapInstance = initMap();
            };
            document.head.appendChild(script);
        } else {
            mapInstance = initMap();
        }

        return () => {
            if (mapInstance) mapInstance.remove();
        };
    }, [showMap, nearbyStations]);

    useEffect(() => {
        const rateInterval = setInterval(fetchRates, 5 * 60 * 1000);
        return () => clearInterval(rateInterval);
    }, []);

    const getConvertedPrice = (euroPrice: string) => {
        if (!rates || !rates.eur_krw.price) return '...';
        const rate = parseFloat(rates.eur_krw.price.replace(/,/g, ''));
        const price = parseFloat(euroPrice.replace(/,/g, ''));
        if (isNaN(rate) || isNaN(price)) return '...';
        return (price * rate).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    };

    const formatUpdateTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}분 전`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}시간 전`;
        
        return date.toLocaleString('ko-KR', { 
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit'
        });
    };

    const handleRefresh = async () => {
        setItemsLoading(true);
        setRateLoading(true);
        try {
            // Force cache bypass by adding timestamp query parameter
            const timestamp = Date.now();
            const [ratesRes, itemsRes] = await Promise.all([
                fetch(`/api/exchange-rate?t=${timestamp}`),
                fetch(`/api/prices?t=${timestamp}`)
            ]);
            
            if (ratesRes.ok) {
                const ratesData = await ratesRes.json();
                setRates(ratesData);
            }
            
            if (itemsRes.ok) {
                const itemsData = await itemsRes.json();
                setPriceItems(itemsData);
            }
            
            setLastUpdated(new Date().toISOString());
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setItemsLoading(false);
            setRateLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Deutsche Preise</h1>
            </header>

            <div className={styles.mainStack}>
                <div className={styles.bigCard}>
                    <h2 className={styles.bigTitle}>
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg"
                            alt="EU"
                            style={{ width: '28px', height: 'auto', borderRadius: '4px' }}
                        />
                        EUR ➔
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg"
                            alt="KRW"
                            style={{ width: '28px', height: 'auto', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        KRW
                    </h2>

                    {rateLoading && !rates ? (
                        <div style={{ padding: '20px', opacity: 0.6 }}>Loading...</div>
                    ) : rates ? (
                        <>
                            <div className={styles.bigPriceContainer}>
                                <span className={styles.bigPrice}>{rates.eur_krw.price}</span>
                                <span className={styles.bigUnit}>원</span>
                            </div>
                            <div className={styles.bigChange}>
                                {rates.eur_krw.change}
                            </div>
                        </>
                    ) : (
                        <div>Unavailable</div>
                    )}

                    <div className={styles.bigCardFooter}>
                        <div>naver.com</div>
                        <div>Live updates every 5 minutes</div>
                    </div>
                </div>

                {/* Naver Real-time Buttons */}
                <div className={styles.naverButtonsRow}>
                    <a
                        className={styles.naverRateButton}
                        href="https://m.search.naver.com/search.naver?query=EUR+KRW"
                    >
                        <IoSearch size={18} />
                        Real-time NAVER EUR Rate
                    </a>
                    <a
                        className={styles.naverRateButton}
                        href="https://m.search.naver.com/search.naver?query=USD+KRW"
                    >
                        <IoSearch size={18} />
                        Real-time NAVER USD Rate
                    </a>
                </div>

                {itemsLoading && priceItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                        Loading prices...
                    </div>
                )}

                {priceItems.map((item, index) => {
                    const isGasDiesel = item.item === '주유 (디젤)';
                    const isBottledWater = item.item === '생수';

                    return (
                        <div key={index} style={{ display: 'contents' }}>
                            {isGasDiesel && (
                                <div className={styles.actionSection}>
                                    <button
                                        className={styles.nearbyButton}
                                        onClick={findNearbyGas}
                                        disabled={isSearchingNearby}
                                    >
                                        {isSearchingNearby ? (
                                            "Searching..."
                                        ) : (
                                            <>
                                                <IoLocation size={20} />
                                                Find Nearby Gas Stations (10km)
                                            </>
                                        )}
                                    </button>
                                    {error && <div className={styles.errorText}>{error}</div>}
                                </div>
                            )}

                            {isBottledWater && (
                                <div className={styles.actionSection}>
                                    <a
                                        href="/aldi"
                                        className={styles.aldiButton}
                                    >
                                        <IoCart size={20} />
                                        Thisweek Top-Deals in Aldi
                                    </a>
                                </div>
                            )}

                            <div className={styles.itemCard}>
                                <div className={styles.itemIndex}>
                                    {index + 1} / {priceItems.length}
                                </div>

                                {item.image && (
                                    <div className={styles.itemImageContainer}>
                                        <img
                                            src={item.image}
                                            alt={item.item}
                                            className={styles.itemImage}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                )}

                                <div className={styles.itemContent}>
                                    <div className={styles.itemHeader}>
                                        <h3 className={styles.itemName}>{item.item}</h3>
                                        {item.category && <span className={styles.itemCategory}>{item.category}</span>}
                                    </div>

                                    <div className={styles.priceRow}>
                                        <span className={styles.itemPrice}>{item.price} €</span>
                                        <span className={styles.convertedPrice}>{getConvertedPrice(item.price)} 원</span>
                                    </div>

                                    {item.description && (
                                        <div className={styles.descriptionBox}>
                                            <p className={styles.itemDescription}>{item.description.replace(/\\n/g, '\n')}</p>
                                        </div>
                                    )}

                                    {item.site && item.link && (
                                        <a href={item.site} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={item.link}
                                                alt="Store Link"
                                                className={styles.brandLogo}
                                            />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {showMap && (
                    <div className={styles.mapOverlay}>
                        <div className={styles.mapContainer}>
                            <div className={styles.mapHeader}>
                                <h3>Nearby Gas Stations (10km)</h3>
                                <button className={styles.closeMap} onClick={() => setShowMap(false)}>
                                    <IoClose size={24} />
                                </button>
                            </div>
                            <div id="gas-map" className={styles.mapElement}></div>
                            <div className={styles.mapListings}>
                                {nearbyStations.map((s, idx) => (
                                    <div
                                        key={idx}
                                        id={`station-${s.id}`}
                                        className={styles.mapListingItem}
                                        style={{ transition: 'background-color 0.5s ease' }}
                                    >
                                        <div className={styles.listingInfo}>
                                            <div className={styles.listingBrand}>{s.brand || s.name}</div>
                                            <div className={styles.listingPrice}>
                                                <span>Diesel: {s.diesel.toFixed(3)}€</span>
                                                <span>E10: {s.e10.toFixed(3)}€</span>
                                            </div>
                                            <div className={styles.listingDist}>{(s.dist * 1).toFixed(1)} km</div>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.navigateButton}
                                            title="Get Directions"
                                        >
                                            <IoNavigate size={18} />
                                            <span>Directions</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!itemsLoading && priceItems.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No price data found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
