import Counter from '../models/counter.model.js';

export async function generateCustomId(prefix, session = null) {
    const year = new Date().getFullYear();
    const key = `${prefix.toLowerCase()}_${year}`;

    const options = {
        upsert: true, returnDocument: 'after',
    };
    if (session) {
        options.session = session;
    }

    const result = await Counter.findOneAndUpdate({_id: key}, {$inc: {seq: 1}}, options);

    const doc = result?.value !== undefined ? result.value : result;
    const seq = doc?.seq || 1;

    return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}