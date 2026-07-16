import pb from './pocketbase-client.mjs';

async function checkRules() {
  try {
    const collection = await pb.collections.getOne('seasonalDues');
    console.log('listRule:', collection.listRule);
    console.log('viewRule:', collection.viewRule);
    console.log('createRule:', collection.createRule);
    console.log('updateRule:', collection.updateRule);
    console.log('deleteRule:', collection.deleteRule);
  } catch (err) {
    console.error(err);
  }
}
checkRules();
