import { DefeatMatrix } from '@/components/defeat/DefeatMatrix'
import { getDefeatMatrixData } from '@/lib/defeat/queries'

export default async function DefeatPage() {
  const data = await getDefeatMatrixData()
  return <DefeatMatrix data={data} />
}
