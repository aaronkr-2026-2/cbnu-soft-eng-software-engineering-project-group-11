import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
export default function NewRoll(){const router=useRouter();return <View style={s.container}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Back</Text></Pressable><Text style={s.title}>New Roll</Text><Text style={s.text}>Base screen — film, camera, format and date will be added next.</Text></View>}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#fff',padding:24,paddingTop:60},back:{fontSize:17,marginBottom:28},title:{fontSize:30,fontWeight:'700'},text:{marginTop:16,color:'#666',fontSize:16,lineHeight:24}});
