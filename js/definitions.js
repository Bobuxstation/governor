let loaded = {};
let foliage = [
    'assets/Tree.glb',
    'assets/Tree2.glb',
    'assets/Tree3.glb'
];

let houses = [
    'assets/residential/house-1'
];

//biased random
function mulberry32(a) {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// open tab
function openTab(tabname, tabGroup, doubleClickHide = false) {
    let tabs = document.getElementsByClassName(tabGroup);
    Object.values(tabs).forEach(element => {
        let action = (element.id == tabname) ? "block" : "none";
        let prev = element.style.display;

        if (doubleClickHide & prev == action & action == "block") {
            element.style.animation = "slideOutDown 0.25s both";
            setTimeout(() => {
                element.style.display = "none";
                element.style.animation = "bounceInUp 0.5s both";
            }, 250);
        } else {
            element.style.display = action;
        }
    });
}