// AR Carrier Xpress - Enhanced Pay Calculator with Realistic Washington Trucking Data
// Based on 2024 BLS data and Washington state trucking industry averages

// Realistic Washington Trucking Market Data (2024)
const washingtonTruckingData = {
    // Owner Operator Rates (per mile) - Washington averages
    ownerOperator: {
        conservative: {
            ratePerMile: 2.30,      // Lower end for new operators
            milesPerYear: 100000,
            milesPerWeek: 1923,
            description: "Steady freight, consistent routes"
        },
        realistic: {
            ratePerMile: 2.65,      // Average for experienced operators
            milesPerYear: 115000,
            milesPerWeek: 2212,
            description: "Realistic PNW market performance"
        },
        aggressive: {
            ratePerMile: 3.10,      // Premium freight, specialized
            milesPerYear: 130000,
            milesPerWeek: 2500,
            description: "Premium freight, specialized routes"
        }
    },
    
    // Company Driver Rates - AR Carrier Xpress Specific Rates
    companyDriver: {
        baseRatePerMile: 0.65,      // AR Carrier Xpress base rate
        milesPerWeek: {
            local: 1200,            // Local routes
            regional: 2200,          // Regional routes  
            otr: 2800               // Over the road
        },
        baseSalary: {
            local: 65000,           // Annual base for local
            regional: 75000,         // Annual base for regional
            otr: 85000              // Annual base for OTR
        },
        bonuses: {
            safety: 500,            // Monthly safety bonus
            performance: 300,       // Monthly performance bonus
            signOn: 2500           // One-time sign-on bonus
        },
        benefitsValue: 18000        // Annual benefits package value
    },
    
    // Realistic Expenses (Washington 2024)
    expenses: {
        fuelCostPerMile: 0.62,      // Current WA diesel average
        maintenanceCostPerMile: 0.14, // Includes repairs, tires, etc.
        truckPaymentAnnual: 24000,  // Average truck payment
        insuranceAnnual: 18000,     // Primary liability + cargo
        permitsTollsAnnual: 8000,   // WA permits, tolls, IFTA
        dispatchFeePercentage: 9,   // AR Carrier Xpress dispatch fee
        miscellaneousAnnual: 5000,  // Cell phone, ELD, etc.
        taxes: {
            federal: 0.22,          // Federal tax rate
            state: 0.0,             // WA has no state income tax
            selfEmployment: 0.1413  // Self-employment tax for owner ops
        }
    },
    
    // Location Multipliers (Washington specific)
    locationMultipliers: {
        seattle: 1.12,              // Seattle metro premium
        spokane: 0.96,              // Eastern WA slightly lower
        portland: 1.05,             // Portland/Vancouver area
        regional: 1.0               // Base regional rate
    },
    
    // Seasonal Multipliers
    seasonalMultipliers: {
        normal: 1.0,
        peak: 1.18,                 // Peak season (holidays, harvest)
        slow: 0.87                  // Slow season adjustments
    }
};

// Calculator State
let calculatorState = {
    driverType: 'owner-operator',
    experienceLevel: 'realistic',
    milesPerYear: 115000,
    ratePerMile: 2.65,
    location: 'seattle',
    seasonal: 'normal',
    routeType: 'regional',
    workArrangement: 'fullTime'
};

// Initialize Calculator
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateCalculations();
    initializeCharts();
});

function initializeEventListeners() {
    // Driver Type Radio Buttons
    document.querySelectorAll('input[name="driverType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            calculatorState.driverType = this.value;
            toggleDriverTypeSections();
            updateCalculations();
        });
    });

    // Experience Level Dropdown
    const experienceSelect = document.getElementById('experienceLevel');
    if (experienceSelect) {
        experienceSelect.addEventListener('change', function() {
            calculatorState.experienceLevel = this.value;
            updateDefaultValues();
            updateCalculations();
        });
    }

    // Miles Per Year Slider
    const milesRange = document.getElementById('milesRange');
    const milesValue = document.getElementById('milesValue');
    if (milesRange && milesValue) {
        milesRange.addEventListener('input', function() {
            calculatorState.milesPerYear = parseInt(this.value);
            milesValue.textContent = this.value.toLocaleString();
            updateCalculations();
        });
    }

    // Rate Per Mile Slider
    const rateRange = document.getElementById('rateRange');
    const rateValue = document.getElementById('rateValue');
    if (rateRange && rateValue) {
        rateRange.addEventListener('input', function() {
            calculatorState.ratePerMile = parseFloat(this.value);
            rateValue.textContent = this.value.toFixed(2);
            updateCalculations();
        });
    }

    // Location Dropdown
    const locationSelect = document.getElementById('location');
    if (locationSelect) {
        locationSelect.addEventListener('change', function() {
            calculatorState.location = this.value;
            updateCalculations();
        });
    }

    // Seasonal Dropdown
    const seasonalSelect = document.getElementById('seasonal');
    if (seasonalSelect) {
        seasonalSelect.addEventListener('change', function() {
            calculatorState.seasonal = this.value;
            updateCalculations();
        });
    }

    // Route Type (for company drivers)
    const routeRadios = document.querySelectorAll('input[name="routeType"]');
    if (routeRadios.length > 0) {
        routeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                calculatorState.routeType = this.value;
                updateCalculations();
            });
        });
    }
}

function toggleDriverTypeSections() {
    const isOwnerOp = calculatorState.driverType === 'owner-operator';
    const experienceSection = document.getElementById('experience-section');
    const milesSection = document.getElementById('miles-section');
    const rateSection = document.getElementById('rate-section');
    const routeSection = document.getElementById('route-section');
    
    if (experienceSection) experienceSection.style.display = isOwnerOp ? 'block' : 'none';
    if (milesSection) milesSection.style.display = isOwnerOp ? 'block' : 'none';
    if (rateSection) rateSection.style.display = isOwnerOp ? 'block' : 'none';
    if (routeSection) {
        routeSection.style.display = isOwnerOp ? 'none' : 'block';
        routeSection.classList.toggle('hidden', isOwnerOp);
    }
}

function updateDefaultValues() {
    const scenario = washingtonTruckingData.ownerOperator[calculatorState.experienceLevel];
    if (scenario) {
        calculatorState.milesPerYear = scenario.milesPerYear;
        calculatorState.ratePerMile = scenario.ratePerMile;
        
        const milesRange = document.getElementById('milesRange');
        const milesValue = document.getElementById('milesValue');
        const rateRange = document.getElementById('rateRange');
        const rateValue = document.getElementById('rateValue');
        
        if (milesRange && milesValue) {
            milesRange.value = scenario.milesPerYear;
            milesValue.textContent = scenario.milesPerYear.toLocaleString();
        }
        if (rateRange && rateValue) {
            rateRange.value = scenario.ratePerMile;
            rateValue.textContent = scenario.ratePerMile.toFixed(2);
        }
    }
}

function updateCalculations() {
    if (calculatorState.driverType === 'owner-operator') {
        updateOwnerOperatorCalculations();
    } else {
        updateCompanyDriverCalculations();
    }
}

function updateOwnerOperatorCalculations() {
    const locationMultiplier = washingtonTruckingData.locationMultipliers[calculatorState.location] || 1.0;
    const seasonalMultiplier = washingtonTruckingData.seasonalMultipliers[calculatorState.seasonal] || 1.0;
    
    // Calculate Gross Revenue
    const baseGrossRevenue = calculatorState.milesPerYear * calculatorState.ratePerMile;
    const adjustedGrossRevenue = baseGrossRevenue * locationMultiplier * seasonalMultiplier;
    
    // Calculate Expenses
    const fuelCosts = calculatorState.milesPerYear * washingtonTruckingData.expenses.fuelCostPerMile;
    const maintenance = calculatorState.milesPerYear * washingtonTruckingData.expenses.maintenanceCostPerMile;
    const dispatchFee = adjustedGrossRevenue * (washingtonTruckingData.expenses.dispatchFeePercentage / 100);
    const insurance = washingtonTruckingData.expenses.insuranceAnnual;
    const truckPayment = washingtonTruckingData.expenses.truckPaymentAnnual;
    const permitsTolls = washingtonTruckingData.expenses.permitsTollsAnnual;
    const miscellaneous = washingtonTruckingData.expenses.miscellaneousAnnual;
    
    const totalExpenses = fuelCosts + maintenance + dispatchFee + insurance + truckPayment + permitsTolls + miscellaneous;
    
    // Calculate Net Income (before taxes)
    const netBeforeTaxes = adjustedGrossRevenue - totalExpenses;
    
    // Calculate Taxes (simplified - owner operators pay self-employment tax)
    const selfEmploymentTax = netBeforeTaxes * washingtonTruckingData.expenses.taxes.selfEmployment;
    const federalTax = (netBeforeTaxes - selfEmploymentTax) * washingtonTruckingData.expenses.taxes.federal;
    const totalTaxes = selfEmploymentTax + federalTax;
    
    // Final Net Income
    const netIncome = netBeforeTaxes - totalTaxes;
    const weeklyAverage = netIncome / 52;
    const monthlyAverage = netIncome / 12;
    const takeHomePercent = (netIncome / adjustedGrossRevenue) * 100;
    
    // Update UI Elements
    updateDisplay('grossRevenue', adjustedGrossRevenue);
    updateDisplay('netIncome', netIncome);
    updateDisplay('weeklyAverage', weeklyAverage);
    updateDisplay('monthlyAverage', monthlyAverage);
    updateDisplay('takeHomePercent', takeHomePercent);
    
    // Update Detailed Breakdown
    updateDetailBreakdown({
        gross: adjustedGrossRevenue,
        dispatch: dispatchFee,
        fuel: fuelCosts,
        maintenance: maintenance,
        insurance: insurance,
        truck: truckPayment,
        permits: permitsTolls,
        misc: miscellaneous,
        taxes: totalTaxes,
        net: netIncome
    });
    
    // Update Charts
    updateExpenseChart(adjustedGrossRevenue, fuelCosts, maintenance, dispatchFee, insurance, truckPayment, permitsTolls + miscellaneous, totalTaxes);
    updateComparisonChart(netIncome, weeklyAverage);
}

function updateCompanyDriverCalculations() {
    const routeData = washingtonTruckingData.companyDriver.milesPerWeek[calculatorState.routeType] || 2200;
    const baseSalary = washingtonTruckingData.companyDriver.baseSalary[calculatorState.routeType] || 75000;
    const locationMultiplier = washingtonTruckingData.locationMultipliers[calculatorState.location] || 1.0;
    const seasonalMultiplier = washingtonTruckingData.seasonalMultipliers[calculatorState.seasonal] || 1.0;
    
    // Calculate Annual Miles
    const annualMiles = routeData * 52;
    
    // Calculate Base Pay (miles × rate)
    const basePay = annualMiles * washingtonTruckingData.companyDriver.baseRatePerMile;
    
    // Apply location and seasonal multipliers
    const adjustedBasePay = basePay * locationMultiplier * seasonalMultiplier;
    
    // Add Base Salary Component
    const totalBaseCompensation = adjustedBasePay + (baseSalary * locationMultiplier);
    
    // Add Bonuses
    const safetyBonus = washingtonTruckingData.companyDriver.bonuses.safety * 12;
    const performanceBonus = washingtonTruckingData.companyDriver.bonuses.performance * 12;
    const signOnBonus = washingtonTruckingData.companyDriver.bonuses.signOn;
    
    // Total Gross Compensation
    const grossCompensation = totalBaseCompensation + safetyBonus + performanceBonus + signOnBonus;
    
    // Benefits Value
    const benefitsValue = washingtonTruckingData.companyDriver.benefitsValue;
    
    // Calculate Taxes (simplified - W2 employee)
    const federalTax = grossCompensation * washingtonTruckingData.expenses.taxes.federal;
    const totalTaxes = federalTax; // No state tax in WA
    
    // Net Income
    const netIncome = grossCompensation - totalTaxes;
    const weeklyAverage = netIncome / 52;
    const monthlyAverage = netIncome / 12;
    
    // Total Compensation (including benefits)
    const totalCompensation = grossCompensation + benefitsValue;
    
    // Update UI Elements
    updateDisplay('grossRevenue', grossCompensation);
    updateDisplay('netIncome', netIncome);
    updateDisplay('weeklyAverage', weeklyAverage);
    updateDisplay('monthlyAverage', monthlyAverage);
    updateDisplay('totalCompensation', totalCompensation);
    
    // Update Company Driver Breakdown
    updateCompanyDriverBreakdown({
        basePay: adjustedBasePay,
        baseSalary: baseSalary * locationMultiplier,
        safetyBonus: safetyBonus,
        performanceBonus: performanceBonus,
        signOnBonus: signOnBonus,
        gross: grossCompensation,
        taxes: totalTaxes,
        net: netIncome,
        benefits: benefitsValue,
        total: totalCompensation
    });
    
    // Update Charts
    updateCompanyDriverCharts(grossCompensation, benefitsValue, totalTaxes);
}

function updateDisplay(id, value) {
    const element = document.getElementById(id);
    if (element) {
        if (id.includes('Percent')) {
            element.textContent = value.toFixed(1) + '%';
        } else {
            element.textContent = '$' + Math.round(value).toLocaleString();
        }
    }
}

function updateDetailBreakdown(data) {
    const breakdown = {
        'detailGross': data.gross,
        'detailDispatch': data.dispatch,
        'detailFuel': data.fuel,
        'detailMaintenance': data.maintenance,
        'detailInsurance': data.insurance,
        'detailTruck': data.truck,
        'detailOther': data.permits + data.misc,
        'detailTaxes': data.taxes,
        'detailNet': data.net
    };
    
    Object.keys(breakdown).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (key === 'detailDispatch' || key === 'detailGross' || key === 'detailNet') {
                element.textContent = '$' + Math.round(breakdown[key]).toLocaleString();
            } else {
                element.textContent = '-$' + Math.round(breakdown[key]).toLocaleString();
            }
        }
    });
}

function updateCompanyDriverBreakdown(data) {
    // Update the breakdown container HTML for company drivers
    const breakdownContainer = document.getElementById('breakdown-container');
    if (breakdownContainer) {
        breakdownContainer.innerHTML = `
            <div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Base Pay (Miles × Rate):</span>
                    <span class="font-semibold" id="detailBasePay">$${Math.round(data.basePay).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Base Salary:</span>
                    <span class="font-semibold" id="detailBaseSalary">$${Math.round(data.baseSalary).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Safety Bonus:</span>
                    <span class="font-semibold text-green-600" id="detailSafetyBonus">+$${Math.round(data.safetyBonus).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Performance Bonus:</span>
                    <span class="font-semibold text-green-600" id="detailPerformanceBonus">+$${Math.round(data.performanceBonus).toLocaleString()}</span>
                </div>
            </div>
            <div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Sign-On Bonus:</span>
                    <span class="font-semibold text-green-600" id="detailSignOnBonus">+$${Math.round(data.signOnBonus).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Gross Compensation:</span>
                    <span class="font-semibold" id="detailGross">$${Math.round(data.gross).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Taxes:</span>
                    <span class="font-semibold text-red-600" id="detailTaxes">-$${Math.round(data.taxes).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Benefits Value:</span>
                    <span class="font-semibold text-blue-600" id="detailBenefits">+$${Math.round(data.benefits).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-3 border-t-2 border-gray-400 mt-2">
                    <span class="font-bold text-gray-900">Net Take-Home:</span>
                    <span class="font-bold text-green-600 text-lg" id="detailNet">$${Math.round(data.net).toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 mt-2">
                    <span class="font-semibold text-gray-700">Total Compensation:</span>
                    <span class="font-bold text-blue-600 text-lg" id="detailTotal">$${Math.round(data.total).toLocaleString()}</span>
                </div>
            </div>
        `;
    }
}

function updateExpenseChart(grossRevenue, fuelCosts, maintenance, dispatchFee, insurance, truckPayment, otherExpenses, taxes) {
    const chartElement = document.getElementById('expenseChart');
    if (!chartElement) return;
    
    const data = [{
        values: [fuelCosts, maintenance, dispatchFee, insurance, truckPayment, otherExpenses, taxes],
        labels: ['Fuel', 'Maintenance', 'Dispatch (9%)', 'Insurance', 'Truck Payment', 'Other', 'Taxes'],
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#ef4444', '#f97316', '#dc2626', '#3b82f6', '#6366f1', '#8b5cf6', '#64748b']
        },
        textinfo: 'label+percent',
        textposition: 'outside'
    }];

    const layout = {
        title: '',
        showlegend: false,
        margin: { t: 0, b: 0, l: 0, r: 0 },
        font: { size: 12 }
    };

    Plotly.newPlot('expenseChart', data, layout, {displayModeBar: false});
}

function updateCompanyDriverCharts(grossCompensation, benefitsValue, taxes) {
    const chartElement = document.getElementById('expenseChart');
    if (!chartElement) return;
    
    const data = [{
        values: [grossCompensation - taxes, benefitsValue, taxes],
        labels: ['Net Pay', 'Benefits', 'Taxes'],
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#22c55e', '#3b82f6', '#64748b']
        },
        textinfo: 'label+percent',
        textposition: 'outside'
    }];

    const layout = {
        title: '',
        showlegend: false,
        margin: { t: 0, b: 0, l: 0, r: 0 },
        font: { size: 12 }
    };

    Plotly.newPlot('expenseChart', data, layout, {displayModeBar: false});
}

function updateComparisonChart(netIncome, weeklyAverage) {
    const chartElement = document.getElementById('comparisonChart');
    if (!chartElement) return;
    
    const washingtonAverage = 63160; // WA state average from BLS
    const industryAverage = 55000;   // National average
    
    const data = [{
        x: ['AR Carrier Xpress', 'WA State Average', 'National Average'],
        y: [netIncome, washingtonAverage, industryAverage],
        type: 'bar',
        marker: {
            color: ['#1e40af', '#64748b', '#9ca3af'],
            line: {
                color: '#374151',
                width: 1
            }
        },
        text: [
            '$' + Math.round(netIncome).toLocaleString(),
            '$' + washingtonAverage.toLocaleString(),
            '$' + industryAverage.toLocaleString()
        ],
        textposition: 'outside',
        textfont: {
            size: 14,
            color: '#1f2937'
        }
    }];

    const layout = {
        title: {
            text: 'Annual Earnings Comparison',
            font: { size: 18, color: '#1f2937' }
        },
        xaxis: {
            title: '',
            tickfont: { size: 12 }
        },
        yaxis: {
            title: 'Annual Earnings ($)',
            tickformat: '$,.0f',
            gridcolor: '#e5e7eb'
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 50, b: 80, l: 80, r: 40 }
    };

    Plotly.newPlot('comparisonChart', data, layout, {displayModeBar: false});
}

function initializeCharts() {
    // Initialize with default owner operator data
    updateOwnerOperatorCalculations();
}
