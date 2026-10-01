export const FRAMES = [
    { id: "oak", name: "Дуб", price: 0 },
    { id: "gold", name: "Золото", price: 80 },
    { id: "rose", name: "Роза", price: 120 },
    { id: "sea", name: "Море", price: 120 },
    { id: "night", name: "Ночь", price: 160 },
    { id: "pearl", name: "Жемчуг", price: 200 }
];

export function frameById(id) {
    return FRAMES.find((item) => item.id === id) || FRAMES[0];
}
