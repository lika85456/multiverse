export default async function sleep(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
};