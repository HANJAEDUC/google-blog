"use client";

import { useEffect, useState } from 'react';
import styles from './prices.module.css';
import { Rates, PriceItem, GasStation } from '@/lib/data';
import { IoSearch, IoLocation, IoClose, IoNavigate } from 'react-icons/io5';

/* Client-side fetch removed in favor of SSR/ISR */

interface Props {
    initialItems: PriceItem[];
    initialRates: Rates;
}

export default function PricesClient({ initialItems, initialRates }: Props) {
    // State
    const [rates, setRates] = useState<Rates | null>(initialRates);
    const [rateLoading, setRateLoading] = useState(false);

    const [priceItems, setPriceItems] = useState<PriceItem[]>(initialItems);
    const [itemsLoading, setItemsLoading] = useState(false);

    // Nearby Gas States
    const [nearbyStations, setNearbyStations] = useState<GasStation[]>([]);
    const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Exchange Rate (Client update loop only)
    const fetchRates = async () => {
        try {
            // setRateLoading(true); // Don't show loading on background update
            const res = await fetch('/api/exchange-rate');
            if (res.ok) {
                const data = await res.json();
                setRates(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            // setRateLoading(false);
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

        // Load Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet JS
        const initMap = () => {
            const L = (window as any).L;
            if (!L) return;

            const map = L.map('gas-map').setView([nearbyStations[0].lat, nearbyStations[0].lng], 12);

            // Dark Mode Tiles (CartoDB Dark Matter)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            }).addTo(map);

            // Add User Location Marker (Blue Dot)
            if (userLoc) {
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

    // Client refetch loop
    useEffect(() => {
        const rateInterval = setInterval(fetchRates, 10 * 60 * 1000); // 10 mins
        // Note: CSV refresh is now handled by revalidating the page (5 mins) or manual reload.
        // We removed client-side CSV fetching to rely on ISR cache consistency.

        return () => {
            clearInterval(rateInterval);
        };
    }, []);

    const getConvertedPrice = (euroPrice: string) => {
        if (!rates || !rates.eur_krw.price) return '...';
        const rate = parseFloat(rates.eur_krw.price.replace(/,/g, ''));
        const price = parseFloat(euroPrice.replace(/,/g, ''));
        if (isNaN(rate) || isNaN(price)) return '...';
        // Korean specific formatting
        return (price * rate).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Deutsche Preise</h1>
            </header>

            <div className={styles.mainStack}>
                {/* Big Exchange Rate Card */}
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
                        <div>Live exchange rate updates every 10 minutes</div>
                    </div>
                </div>

                {/* Loading State for Items */}
                {itemsLoading && priceItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                        Loading prices...
                    </div>
                )}

                {/* Price Items List */}
                {priceItems.map((item, index) => {
                    const isGasDiesel = item.item === '주유 (디젤)';

                    return (
                        <div key={index} style={{ display: 'contents' }}>
                            {/* Insert Nearby Gas Finder Button right before '주유 (디젤)' */}
                            {isGasDiesel && (
                                <div className={styles.actionSection} style={{ marginBottom: '24px' }}>
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

                            <div className={styles.itemCard}>
                                {/* Index Indicator */}
                                <div className={styles.itemIndex}>
                                    {index + 1} / {priceItems.length}
                                </div>

                                {/* Image Section (Right) */}
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

                                {/* Card Content (Left) */}
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

                                    {/* Logo Link */}
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

                {/* Map Overlay/Modal */}
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
                                    <div key={idx} className={styles.mapListingItem}>
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

                {/* Loading State for Items */}
                {itemsLoading && priceItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                        Loading prices...
                    </div>
                )}

                {/* Price Items List */}
                {priceItems.map((item, index) => (
                    <div key={index} className={styles.itemCard}>
                        {/* Index Indicator */}
                        <div className={styles.itemIndex}>
                            {index + 1} / {priceItems.length}
                        </div>

                        {/* Image Section (Right) */}
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

                        {/* Card Content (Left) */}
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

                            {/* Logo Link */}
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
                ))}

                {!itemsLoading && priceItems.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No price data found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
